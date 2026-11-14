import JSZip from "jszip";

export async function importWorldFromZip(file) {
  const zip = await JSZip.loadAsync(file);

  const manifestPaths = Object.keys(zip.files).filter(
    (path) =>
      !zip.files[path].dir &&
      path.endsWith("manifest.json"),
  );

  if (manifestPaths.length !== 1) {
    throw new Error(
      "The ZIP must contain exactly one manifest.json file.",
    );
  }

  const manifestPath = manifestPaths[0];
  const folderPath = manifestPath.slice(
    0,
    manifestPath.lastIndexOf("/") + 1,
  );

  async function readJson(filename) {
    const path = `${folderPath}${filename}`;
    const zipFile = zip.file(path);

    if (!zipFile) {
      throw new Error(`Missing ${filename} in the ZIP package.`);
    }

    try {
      const content = await zipFile.async("string");
      return JSON.parse(content);
    } catch {
      throw new Error(`${filename} is not valid JSON.`);
    }
  }

  const draft = {
    manifest: await readJson("manifest.json"),
    rooms: await readJson("rooms.json"),
    entities: await readJson("entities.json"),
    rules: await readJson("rules.json"),
    text: await readJson("text.json"),
  };

  // Basic package structure checks.
  if (
    !draft.manifest ||
    !Array.isArray(draft.rooms) ||
    !Array.isArray(draft.entities) ||
    !Array.isArray(draft.rules) ||
    !draft.text
  ) {
    throw new Error("The ZIP does not contain a valid world structure.");
  }

  return draft;
}
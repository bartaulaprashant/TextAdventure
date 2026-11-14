import JSZip from "jszip";

export async function exportWorldAsZip(draft) {
  const zip = new JSZip();

  const folderName = draft.manifest.id || "my-adventure";
  const worldFolder = zip.folder(folderName);

  worldFolder.file(
    "manifest.json",
    JSON.stringify(draft.manifest, null, 2),
  );

  worldFolder.file(
    "rooms.json",
    JSON.stringify(draft.rooms, null, 2),
  );

  worldFolder.file(
    "entities.json",
    JSON.stringify(draft.entities, null, 2),
  );

  worldFolder.file(
    "rules.json",
    JSON.stringify(draft.rules, null, 2),
  );

  worldFolder.file(
    "text.json",
    JSON.stringify(draft.text, null, 2),
  );

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6,
    },
  });

  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${folderName}.zip`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
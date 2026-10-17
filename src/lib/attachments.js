// Reads File objects into the { filename, content } shape sendEmail.js
// forwards to Resend (content is a base64 string, no `data:` prefix).
export function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] || '';
      resolve({ filename: file.name, content: base64 });
    };
    reader.readAsDataURL(file);
  });
}

export async function filesToAttachments(files) {
  return Promise.all(files.map(fileToAttachment));
}

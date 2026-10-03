import { resolve, isAbsolute, sep } from "node:path";
import { createRequire, Module } from "node:module";

const root = resolve(process.argv[2] || ".next/standalone");
const original = Module._resolveFilename;
// CI has a full node_modules above the artifact. Do not let it conceal a missing runtime.
Module._resolveFilename = function (...args) {
  const file = original.apply(this, args);
  if (isAbsolute(file) && file !== root && !file.startsWith(root + sep))
    throw new Error(`Standalone runtime escapes the deploy tree: ${args[0]}`);
  return file;
};
try {
  const load = createRequire(resolve(root, "server.js"));
  const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = load("@aws-sdk/client-s3");
  const client = new S3Client({ region: "auto", endpoint: "https://example.invalid", credentials: { accessKeyId: "fixture", secretAccessKey: "fixture" }, forcePathStyle: true });
  for (const Command of [PutObjectCommand, DeleteObjectCommand, HeadObjectCommand])
    new Command({ Bucket: "public", Key: "fixture" });
  client.destroy();
  console.log("Standalone S3 runtime resolves entirely inside the deploy tree");
} finally { Module._resolveFilename = original; }

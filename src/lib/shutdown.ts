export async function shutdown() {
  await new Promise((r) => setTimeout(r, 2000));
  process.exit(0);
}

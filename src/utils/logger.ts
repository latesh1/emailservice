export const logger = {
  log(msg: string) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
};

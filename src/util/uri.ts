const PROTOCOL_PATTERN = /^(\w{2,}):\/\//i;

export const getProtocol = (uri: string) => {
  const match = PROTOCOL_PATTERN.exec(uri);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
};

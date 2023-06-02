const levels = [
  "View Only",
  "Can Edit",
  "Can Transfer",
  "Can Execute",
  "Full Control",
  "Creator",
];

export function hasPermission(level, required) {
  // Checks if permission is greater or equal required level
  const reqIndex = levels.indexOf(required);
  const levelIndex = levels.indexOf(level);
  return levelIndex >= reqIndex;
}

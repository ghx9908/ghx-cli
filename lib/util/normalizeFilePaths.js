const slash = require("slash")

//   window  \  mac  /    \ => /
module.exports = function normalizeFilePaths(files) {
  Object.keys(files).forEach((filePath) => {
    const normalized = slash(filePath)
    if (filePath !== normalized) {
      files[normalized] = files[filePath]
      delete files[filePath]
    }
  })
  return files
}

const { chalk } = require("@vue/cli-shared-utils")
module.exports = (pmInstance) => {
  // 插入新特性
  pmInstance.injectFeature({
    name: "Router",
    value: "router",
    description: "Structure the app with dynamic pages",
    link: "https://router.vuejs.org/",
  })
  //插入新的提示选项
  pmInstance.injectPrompt({
    name: "historyMode",
    when: (answers) => answers.features && answers.features.includes("router"),
    type: "confirm",
    message: `Use history mode for router? ${chalk.yellow(
      `(Requires proper server setup for index fallback in production)`
    )}`,
    description: `By using the HTML5 History API, the URLs don't need the '#' character anymore.`,
    link: "https://router.vuejs.org/guide/essentials/history-mode.html",
  })
  //选完提示框的回调
  pmInstance.onPromptComplete((answers, options) => {
    if (answers.features && answers.features.includes("router")) {
      options.plugins["@vue/cli-plugin-router"] = {
        historyMode: answers.historyMode,
      }
    }
  })
}

module.exports = class PromptModuleAPI {
  // 入参 creator 为 Creator 的实例。
  constructor(creator) {
    this.creator = creator
  }

  // 给 featurePrompt 注入复选框值
  injectFeature(feature) {
    this.creator.featurePrompt.choices.push(feature)
  }

  // 给 injectedPrompts 注入选项
  injectPrompt(prompt) {
    this.creator.injectedPrompts.push(prompt)
  }

  injectOptionForPrompt(name, option) {
    this.creator.injectedPrompts
      .find((f) => {
        return f.name === name
      })
      .choices.push(option)
  }

  // 注入回调
  onPromptComplete(cb) {
    this.creator.promptCompleteCbs.push(cb)
  }
}

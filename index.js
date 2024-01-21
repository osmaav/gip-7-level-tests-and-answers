$(document).ready(function () {
  // константа, в которой мы определяем, под чем мы работаем
  if (!$ws._const.browser.isMobileSafari) {
    return
  }

  var $body = $('body')

  // добавляем класс при наведении
  function addPseudoHover() {
    this.classList.add('ws-pseudo-hover')
  }

  // удаляем класс при уходе "мыши"
  function removePseudoHover() {
    this.classList.remove('ws-pseudo-hover')
  }

  // Используем в [].filter(...)
  function uniq(item, index, array) {
    return array.indexOf(item, index + 1) == -1
  }

  function trimHoverBase(selector) {
    return selector.substr(0, selector.indexOf(':hover')).trim()
  }

  function filterHoverSelectors(selector) {
    return selector.indexOf(':hover') != -1
  }

  function createBodyDelegate(hoverSelector) {
    $body.delegate(hoverSelector, 'mouseenter', addPseudoHover)
    $body.delegate(hoverSelector, 'mouseleave', removePseudoHover)
  }

  function processMutationRecord(mutationRecord) {
    var needRefresh = false
    if (mutationRecord.addedNodes) {
      for (var i = 0, l = mutationRecord.addedNodes.length; i < l; i++) {
        if (mutationRecord.addedNodes[i].nodeName == 'LINK') {
          needRefresh = true
          break
        }
      }
    }
    if (needRefresh) {
      checkStylesheetSetDebonuced() // Не будем делать обработку слишком часто
    }
  }

  function checkStylesheetSet() {
    var allHoverSelectors = [],
      allRules = [],
      sheet,
      sheetCheckResult

    for (var i = 0, l = document.styleSheets.length; i < l; i++) {
      sheet = document.styleSheets[i]

      // Проверим, что в стиле есть правила
      if (sheet.processed || sheet.rules.length === 0) {
        continue
      }
      sheetCheckResult = checkCSSRuleSet(sheet)
      if (sheetCheckResult.rules.length > 0 && sheetCheckResult.selectors.length > 0) {
        Array.prototype.push.apply(allHoverSelectors, sheetCheckResult.selectors)
        Array.prototype.push.apply(allRules, sheetCheckResult.rules)
      }
      // чтобы не обрабатывать один и тот же блок несколько раз
      sheet.processed = true
    }

    // замена селектора
    allRules.forEach(function (aRule) {
      aRule.selectorText = aRule.selectorText.replace(':hover', '.ws-pseudo-hover')
    })

    // фильтруем уникальные селекторы, сорздаем делегатов на body
    allHoverSelectors.map(trimHoverBase).filter(uniq).forEach(createBodyDelegate)
  }

  var checkStylesheetSetDebonuced = checkStylesheetSet.debounce(420)

  function checkCSSRuleSet(sheet) {
    var result = {
      selectors: [],
      rules: [],
    }
    for (var i = 0, l = sheet.rules.length; i < l; i++) {
      var rule = sheet.rules[i]

      if (rule.styleSheet && rule.href /* instanceof CSSImportRule*/) {
        // Не забываем про @import
        checkCSSRuleSet(rule.styleSheet)
      } else if (rule.selectorText /* instanceof CSSStyleRule*/) {
        var hoverSelectors = getHoverSelectors(rule)
        if (hoverSelectors.length > 0) {
          if (checkStyles(rule)) {
            Array.prototype.push.apply(result.selectors, hoverSelectors)
            result.rules.push(rule)
          }
        }
      }
    }
    return result
  }

  function checkStyles(rule) {
    for (var i = 0, l = rule.style.length; i < l; i++) {
      var styleItem = rule.style[i]
      if (styleItem == 'display' && rule.style.display !== 'none') {
        return true
      }

      if (styleItem == 'visibility' && rule.style.visibility !== 'hidden') {
        return true
      }
    }
    return false
  }

  function getHoverSelectors(rule) {
    return rule.selectorText.split(',').filter(filterHoverSelectors)
  }

  // мониторим вставку новых детей в head
  new MutationObserver(function (mutationRecords) {
    mutationRecords.forEach(processMutationRecord)
  }).observe(document.getElementsByTagName('head')[0], {
    childList: true,
  })
})

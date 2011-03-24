var tabutil = require('github:afri/sjs4chromeapps/master/tab-util');

exports.main = function() {
  chrome.contextMenus.create(
    { title: "Translate to English",
      contexts: ["selection"],
      onclick: translateTabSelection });
};

function translateTabSelection(info, tab) {
  if (info.frameUrl) return; // XXX we can't translate in frames yet
  waitfor {
    // delegate translation to a content script:
    tabutil.$evalInTab(tab.id, "require('content-main').translateSelection('en')");
  } 
  or {
    // make sure our omnibar button is shown. If the user clicks it,
    // the translation will be cancelled (by virtue of the waitfor-or
    // that this code sits in)
    waitforButtonCollective(tab.id);
  }
}

// waitforButtonCollective:
// Let several strata wait on the same button click (parametrized on
// tabid). If the omnibox button for the given tab isn't shown yet,
// show it. If the button is clicked, all strata waiting for this
// button are resumed. If all strata abort waiting for the button, the
// button will be aborted (i.e. hidden), too.
var buttons = {};
function waitforButtonCollective(tabid) {
  var button = buttons[tabid];
  if (!button) 
    button = buttons[tabid] = spawn waitforButton(tabid);
  try {
    button.waitforValue();
  }
  retract {
    if (!button.waiting())
      button.abort();
  }
  finally {
    if (!button.waiting())
      delete buttons[tabid];
  }
}

// waitforButton:
// Show the extension's button in the omnibox for the given tab; wait
// for it to be clicked; hide it. Also hide when aborted.
function waitforButton(tabid) {
  waitfor() {
    chrome.pageAction.show(tabid);
    function listener(tab) { if (tab.id == tabid) resume(); }
    chrome.pageAction.onClicked.addListener(listener);
  }
  finally {
    chrome.pageAction.onClicked.removeListener(listener);
    chrome.pageAction.hide(tabid);
  }
}
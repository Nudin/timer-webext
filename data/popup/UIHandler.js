'use strict';

var UIHandler = {
  EditableKeypress: function(target) {
    target.addEventListener('keypress', e => {
      if (e.keyCode === 32 || e.keyCode === 13) {
        e.preventDefault();
      }
      if (isNaN(String.fromCharCode(e.which))) {
        e.preventDefault();
      }
      else if (target.textContent.length > 1) {
        if (window.getSelection().toString().length === 2) {
          target.textContent = '';
        }
        else {
          e.preventDefault();
        }
      }
    });
  },
  EditableBlur: function(target, callback) {
    target.addEventListener('blur', () => {
      if (callback !== undefined) {
        callback(target.textContent);
      }
      target.innerText = ('00' + target.textContent).slice(-2);
      target.dataset.value = target.textContent.toString();
    });
  },
  PreventPasteFor: function(target) {
    target.addEventListener('paste', e => {
      e.preventDefault();
    });
  },
  SelectAllText: function(target) {
    const range = document.createRange();
    range.selectNodeContents(target);
    const select = window.getSelection();
    select.removeAllRanges();
    select.addRange(range);
  }
};

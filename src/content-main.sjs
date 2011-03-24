//require('apollo:debug').console({collapsed:true});

//----------------------------------------------------------------------
// translateSelection :
// replace current selection in-place with translation

exports.translateSelection = function(language) {
  try {
    var selection = document.getSelection();
    if (!selection) 
      return; // selection is probably in an iframe; XXX figure out
              // how to handle this
    var range = selection.getRangeAt(0);
    // split the range into short enough strings, so that the google
    // translate service won't throw up on them:
    var strs = splitString((new XMLSerializer()).serializeToString(range.cloneContents()));
    // now translate all the individual strings in parallel:
    require('apollo:cutil').waitforAll(function(val, idx, arr) {
      try {
        arr[idx] = require('apollo:google').translate(val, language).responseData.translatedText;
      }
      catch(e) {
        console.log("Can't translate \""+val+"\": "+e);
      }
    },
                                      strs);
    // ... join them up and convert to HTML:
    var replacement = strs.join(" ");
    var holder = document.createElement('span');
    holder.innerHTML = replacement;
    var child = holder.firstChild;
    var ref = child.cloneNode(true);
    // ... now insert into document in place of the original content:
    range.deleteContents();
    range.insertNode(ref);
    while (child = child.nextSibling) {
      ref.parentNode.insertBefore(child.cloneNode(true), ref.nextSibling);
      ref = ref.nextSibling;
    }
  }
  catch(e) { 
    console.log(e);
    //alert(e) 
  }
};


// Helper to split a string into substrings that the google translate
// service can digest. Attempts to split in intelligent places.  
// XXX Doesn't do a very good job of it; we really want to parse the
// text fully.
function splitString(str) {
  var arr = [];
  var length = str.length;
  var start = 0;

  // determine approx how much longer the string will be when expanded
  // into a URI component:
  var testlength = Math.min(length, 100);
  var factor = encodeURIComponent(str.substr(0,testlength)).length/testlength;
  var maxChars = Math.floor(1100/factor);
  var minChars = Math.max(0, maxChars-100);

  while (length - start > maxChars) {
    var split = start + maxChars;
    var fit = 0;
    for (var i = start + maxChars; i > start + minChars; --i) {
      // search for a '>' or space or '. ' within minChars-maxChars chars:
      if (str[i] == ' ' && fit < 1) {
        // if we find nothing better, we'll split here. but don't break yet.
        split = i;
        fit = 1;
      }
      else if (str[i] == '>' && fit < 2) {
        // possibly end of a tag
        split = i+1;
        fit = 2;
      }
      else if (str[i] == '<' && str[i+1] != '/') {
        // opening tag; perfect place to split
        split = i;
        break;
      }
      else if (str[i] == '.' && (str[i+1] == ' ' || str[i+1] == '\n')) {
        // end of sentence; perfect place to split
        split = i+1;
        break;
      }
    }
    arr.push(str.slice(start, split));
    start = split;
  } 
  if (length - start) {
    arr.push(str.slice(start));
  }
  return arr;
}
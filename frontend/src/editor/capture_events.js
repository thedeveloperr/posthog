import { getSafeText } from '../ActionEdit';

function getClassName(el) {
    switch(typeof el.className) {
        case 'string':
            return el.className;
        case 'object': // handle cases where className might be SVGAnimatedString or some other type
            return el.className.baseVal || el.getAttribute('class') || '';
        default: // future proof
            return '';
    }
}

function isElementNode(el) {
    return el && el.nodeType === 1; // Node.ELEMENT_NODE - use integer constant for browser portability
}

let _previousElementSibling = function(el) {
    if (el.previousElementSibling) {
        return el.previousElementSibling;
    } else {
        do {
            el = el.previousSibling;
        } while (el && !isElementNode(el));
        return el;
    }
}

export let _getPropertiesFromElement = function(elem) {
    var tag_name = elem.tagName.toLowerCase();
    var props = {
        'tag_name': tag_name
    };
    props['$el_text'] = getSafeText(elem);

    var classes = getClassName(elem);
    if(classes.length > 0) props['classes'] = classes.split(' ');

    for(var i = elem.attributes.length -1; i >= 0; i--) {
        let attr = elem.attributes[i];
        if (attr.value) {
            props['attr__' + attr.name] = attr.value;
        }
    }

    var nthChild = 1;
    var nthOfType = 1;
    var currentElem = elem;
    while (currentElem = _previousElementSibling(currentElem)) { // eslint-disable-line no-cond-assign
        nthChild++;
        if (currentElem.tagName === elem.tagName) {
            nthOfType++;
        }
    }
    props['nth_child'] = nthChild;
    props['nth_of_type'] = nthOfType;

    return props;
}
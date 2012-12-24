
var nameMap = {
    split: 'S',
    join: 'J',
    pick: 'P',
    trim: 'T',
    equals: '=',
    js: 'C',
    sum: '+',
    reverse: 'R',
    html: 'H',
    map: 'M',
    filter: 'F',
    flatten: 'B',
    sequence: 'L',
    constant: '"',

    name: 'n',
    separator: 's',
    item: 'i',
    value: 'v',
    expression: 'e',
    withEachItem: '>',
    items: 'l'
};

var keyMap = {};
Object.keys(nameMap).forEach(function(name) {
    keyMap[nameMap[name]] = name;
});

var getKey = function(name) {
    var k = nameMap[name];
    if (!k) {
        throw new Error('Unrecognised name ' + name);
    }
    return k;
};

var mungeImpl = function(obj, parts) {
    if (Array.isArray(obj)) {
        parts.push('[');
        obj.forEach(function(item) {
            mungeImpl(item, parts);
        });
        parts.push(']');
    } else if (obj === null || obj === undefined) {
        parts.push('!');
    } else if (typeof obj == 'object') {
        parts.push('{');
        Object.keys(obj).forEach(function(k) {
            parts.push(getKey(k));
            if (k == 'name') {
                parts.push(getKey([obj[k]]));
            } else {
                mungeImpl(obj[k], parts);
            }
        });
        parts.push('}');
    } else {
        var json = JSON.stringify(obj);
        var numAsStr = (json.length).toString(16);
        parts.push('0000'.substr(numAsStr.length));
        parts.push(numAsStr);
        parts.push(json);
    }
};

var munge = function(obj) {
    var parts = [];
    mungeImpl(obj, parts);
    return encodeURIComponent(parts.join(''));
};

var demungeImpl = function(str, pos) {
    var ch = str[pos.n++];
    if (ch == '[') {
        var ar = [];
        while (str[pos.n] != ']') {
            ar.push(demungeImpl(str, pos));
        }
        pos.n++;
        return ar;
    }
    if (ch == '{') {
        var obj = {};
        while (str[pos.n] != '}') {
            var k = keyMap[str[pos.n++]];
            if (k == 'name') {
                obj[k] = keyMap[str[pos.n++]];
            } else {
                obj[k] = demungeImpl(str, pos);
            }
        }
        pos.n++;
        return obj;
    }
    if (ch == '!') {
        return null;
    }
    var len = parseInt(str.substr(pos.n-1, 4), 16);
    pos.n += 3;
    var json = str.substr(pos.n, len);
    pos.n += len;
    return JSON.parse(json);
};

var demunge = function(str) {
    return demungeImpl(decodeURIComponent(str), { n: 0 });
};
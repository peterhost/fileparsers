//
//  fileparsers.js
//  NODE
//
//  Created by Peter Host on 2010-10-24.
//  Copyright 2010 OGHME.COM. All rights reserved.
//

/*
    TODO
*/
//require.paths.unshift(__dirname); //make local paths accessible

var fs = require('fs'),
    logger = require('lloging'), // custom
    llog = logger.make(); // create an independant logging instance for this module

//llog.on();// enable logging for this script/library

// ## General file-parsing functions
// ### ASYNCHRONOUS
//<!--________________________________________________________-->
// #### rparse (async)
// takes a filepath as argument (which can be a directory path) and traverse the hierarchical tree returning the results as an array of file-paths, asynchronously

function rparse(basePath, callback) {
    var collection = [],
        // number of directories still to be parsed
        // (this is our callback's triger)
        remainingEntries = 1;
    // inner function & closure required to make this work
    function parseR(path) {
        fs.stat(path, function (err, stat) {
            if (err) {
                throw err;
            }
            if (stat.isDirectory()) {
                remainingEntries -= 1; // one more directory to parse
                fs.readdir(path, function (err, files) {
                    remainingEntries += files.length;
                    files.forEach(function (file) {
                        parseR(path + '/' + file);
                    });
                });
            }
            else if (stat.isFile()) {
                remainingEntries -= 1;
                collection.push(path);
                // all entries have been parsed
                if (remainingEntries === 0) {
                    callback(collection);
                }
            }
        });

    }

    parseR(basePath);
}



//<!--________________________________________________________-->
// #### rparsef (async)
// same as rparse but takes a `filter` function it applies on each result of the parsing, as an additional argument

function rparsef(basePath, filter, callback) {
    var collection = [],
        // number of directories still to be parsed
        // (this is our callback's triger)
        remainingEntries = 1;

    if (!filter || typeof(filter) !== "function") {
        throw "ERROR : the filter must be a javascript function";
    }
    // inner function & closure to control the flow of the asynchronous calls
    function parseR(path) {
        fs.stat(path, function (err, stat) {
            var valid;
            if (err) {
                throw err;
            }
            // CASE : directory
            if (stat.isDirectory()) {
                llog.l('ASYNC[' + remainingEntries + ']', 'parsing ' + path);
                fs.readdir(path, function (err, files) {
                    remainingEntries += files.length; // n more entries to parse
                    files.forEach(function (file) {
                        parseR(path + '/' + file);
                    });
                });
                remainingEntries -= 1;
            }
            // CASE : file
            else if (stat.isFile()) {
                llog.l('ASYNC[' + remainingEntries + ']', 'parsing ' + path);
                valid = filter(path);
                // push when entry validates the filter
                if (valid) {
                    //<!--collection.push(remainingEntries + " - " + valid);-->
                    collection.push(valid);
                    llog.l('ASYNC[' + remainingEntries + ']', "-> pushing [" + valid + "] in list");
                }
                remainingEntries -= 1;
                if (remainingEntries === 0) {
                    // all entries have been parsed
                    llog.l('ASYNC[' + remainingEntries + ']', 'ASYNC PARSING FINISHED ');
                    callback(collection);
                }
            }
        });
    }

    parseR(basePath);
}


// ### SYNCHRONOUS
//<!--________________________________________________________-->
// #### rparsefSYNC
// SYNCHRONOUS version of rparsef

function rparsefSYNC(basePath, filter) {
    var collection = [];

    if (!filter || typeof(filter) !== "function") {
        throw "ERROR : the filter must be a javascript function";
    }
    // inner self-called function
    function parseR(path) {
        var stat = fs.statSync(path),
            valid,
            i,
            files;
        if (stat.err) {
            throw stat.err;
        }
        // CASE : directory
        if (stat.isDirectory()) {
            llog.l('SYNC []', 'parsing ' + path);
            files = fs.readdirSync(path);
            for (i = 0; i < files.length; i += 1) {
                parseR(path + '/' + files[i]);
            }
        }
        // CASE : file
        else if (stat.isFile()) {
            llog.l('SYNC []', 'parsing ' + path);
            valid = filter(path);
            // push when entry validates the filter
            if (valid) {
                collection.push(valid);
                llog.l('SYNC []', "-> pushing [" + valid + "] in list");
            }
        }
    }

    parseR(basePath);
    llog.l('SYNC []', 'SYNC PARSING FINISHED ');
    return collection;
}

// ### Regexp functions
//<!--________________________________________________________-->
// #### extReg
// takes a string (file extension) as argument and returns the corresponding regexp for matching filepaths ending with that extension
function extReg(ext) {
    var parse_ext = /[a-zA-Z0-9\/]/,
        res;
    if (ext && typeof ext === 'string' && parse_ext.test(ext)) {
        //console.log(parse_ext.test(ext));
        res = new RegExp("[\\w\\-\\/]+\\." + ext, "g");
        return res;
    }
    else {
        throw new Error('ERROR : "' + ext + '" is not a file extension');
    }
}

//<!--________________________________________________________-->
// #### matcher
// creates a regexp-matching anonymous function from a string. Intended to be used with `rparsef`, as second argument
function matcher(strToMatch) {
    var reg = extReg(strToMatch);
    return function (path) {
        if (path.search(reg) >= 0) {
            return path;
        }
        else {
            return undefined;
        }
    };
}



//
// setTimeout(function () {
//     rparse(
//         '../../express1',
//         function (filearr) {
//             //console.dir(filearr);
//             llog.l(filearr);
//         });
// }, 1000);
//
//
// rparsef(
//     '../../express1',
//     matcher('js'),
//     function (filearr) {
//         llog.l(filearr);
//     }
// );
//




// ### Export the module's methods
exports.rparse = rparse;
exports.rparsef = rparsef;
exports.matcher = matcher;
exports.rparsefSYNC = rparsefSYNC;

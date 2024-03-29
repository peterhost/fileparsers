/*
 ************************************************************************
 *
 *  NAME: fileparsers.js
 *
 *  DESCRIPTION : provides mainly two functions : 'rparsef' and 'rparsefSYNC'
 *                which return arrays of filepaths matching a certain regexp
 *                within a given top level directory
 *
 *  USED BY : 'oghmerouteshelper' module
 *
 *  Created by Peter Host on 2010-10-24.
 *  Copyright 2010 OGHME.COM. All rights reserved.
 *
 *
 ************************************************************************
 */

//_______________________________________________________________________
//                             DEPENDANCIES
//_______________________________________________________________________

var fs = require('fs'),
    logger = require('lloging'), // custom
    llog = logger.make(); // create an independant logging instance for this module

//llog.on();// enable logging for this script/library

function loginit(loglevel) {
  if ( /normal|verbose|veryverbose/.test(loglevel) ) { llog.on(); }
  //if (loglevel ==='verbose' ) { ... } // enable log on child module
  //if (loglevel ==='veryverbose' ) { ... } // enable verbose log on child module
}





//_______________________________________________________________________
//                             HELPERS
//_______________________________________________________________________

//-----------------------------------------------------------------------
//                     REGEX for filename EXTENSION
//  NAME : extReg
//
//  USAGE
//    ext:  string
//
//  DESCRIPTION : takes a string (file extension) as argument and returns the
//  corresponding regexp for matching filepaths ending with that extension
//
//  DEPENDS: none
//
//-----------------------------------------------------------------------

function extReg(ext) {
    var parse_ext = /[a-zA-Z0-9\/]/,
        res;
    if (ext && typeof ext === 'string' && parse_ext.test(ext)) {
        res = new RegExp("[\\w\\-\\/]+\\." + ext, "g");
        return res;
    }
    else {
        throw new Error('ERROR : "' + ext + '" is not a file extension');
    }
}

//-----------------------------------------------------------------------
//               PATH REGEX function generator
//  NAME : matcher
//
//  USAGE
//    ext:  string
//
//  DESCRIPTION : creates a regexp-matching anonymous function from a string.
//  Intended to be used with `rparsef`, as second argument
//
//  DEPENDS: none
//
//-----------------------------------------------------------------------

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


//_______________________________________________________________________
//                             FILE PARSING
//_______________________________________________________________________

//-----------------------------------------------------------------------
//                     (ASYNC)   ROUTE LISTING
//
//  NAME : rparse
//
//  USAGE
//    basepath:  valid path
//    callback:  callback

//  DESCRIPTION : takes a filepath as argument (which can be a directory path)
//  and traverse the hierarchical tree returning the results as an array of
//  file-paths, asynchronously
//
//  DEPENDS: none
//
//-----------------------------------------------------------------------

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



//-----------------------------------------------------------------------
//             (ASYNC)   ROUTE LISTING WITH FILTER
//
//  NAME : rparsef
//
//  USAGE
//    basepath:  valid path
//    filter:    a javascript function
//    callback:  callback

//  DESCRIPTION : same, with filter (javascript function which either
//  returns a path or FALSE)
//
//  An example of filter is generated by the 'matcher' helper function
//
//  DEPENDS: none
//
//-----------------------------------------------------------------------

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


//-----------------------------------------------------------------------
//               (SYNCHRONOUS)   ROUTE LISTING
//
//  NAME : rparsefSYNC
//
//  USAGE
//    basepath:  valid path
//    filter:    a javascript function
//    ignore:    valid regex object
//
//
//  DESCRIPTION : SYNCHRONOUS version of rparsef
//
//  DEPENDS: none
//
//-----------------------------------------------------------------------

function rparsefSYNC(basePath, filter, ignore) {
    var collection = [];

    if (!filter || typeof(filter) !== "function") {
        throw "ERROR : the filter must be a javascript function";
    }
    // inner self-called function
    function parseR(path) {
      // parse the DIR except for to-be-ignored paths
      if (typeof ignore === 'undefined' || !ignore.test(path)) {
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
    }

    parseR(basePath);
    llog.l('SYNC []', 'SYNC PARSING FINISHED ');
    return collection;
}



//_______________________________________________________________________
//                         EXPORTS
//_______________________________________________________________________
// Export the module's methods

exports.loginit     = loginit;
exports.rparse      = rparse;
exports.rparsef     = rparsef;
exports.matcher     = matcher;
exports.rparsefSYNC = rparsefSYNC;


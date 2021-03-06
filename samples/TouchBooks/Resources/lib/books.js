/**
 * CommonJS module that abstracts out the interaction with TiTouchDB
 * and the Books database.
 * 
 * The last argument to each function in this module is a callback that
 * follows the node.js callback style:
 * 
 *   function callback(err, result) {...}
 * 
 * Most of the functions in TiTouchDB are synchronous, but by treating them
 * all as async, we can potentially swap our internal implementation for an
 * async version in the future.
 */

var manager = require('com.obscure.titouchdb').databaseManager,
    db = manager.createDatabaseNamed('books'),
    views = {};
    
exports.initialize = function(cb) {
  // register views
  views.by_author = db.viewNamed('by_author');
  views.by_author.setMap(function(doc, emit) {
    if (doc.author) {
      emit([doc.author, doc.title || ''], null);
    }
  }, '1');
  
  // get the latest changes
  exports.pullFromServer(cb);
};

exports.dumpBooks = function(cb) {
  var query = db.getAllDocuments();
  var rows = query.rows();
  while (row = rows.nextRow()) {
    Ti.API.info('-----');
    Ti.API.info(row.documentID);
    Ti.API.info(JSON.stringify(row.key));
    Ti.API.info(JSON.stringify(row.document.properties));
  }
  cb && cb(null, null);
};


exports.fetchBooksByAuthor = function(cb) {
  var query = views.by_author.query();
  if (!query) {
    cb && cb({ error: 'missing view' }, []);
    return;
  }
  
  var rows = query.rows();
  
  var result = [];
  while (row = rows.nextRow()) {
    result.push(row);
  }
  
  cb && cb(null, result);
};

exports.fetchBook = function(book_id, cb) {
  cb && cb(null, db.documentWithID(book_id));
};

exports.saveBook = function(book_id, properties, cb) {
  var doc = db.documentWithID(book_id);
  var result = doc.putProperties(properties);
  if (result.error) {
    cb && cb(result.error, null);
  }
  else {
    cb && cb(null, doc);
  }
};

var push;
exports.pushToServer = function(cb) {
  push = db.pushToURL('http://touchbooks.iriscouch.com/books');
  push.addEventListener('progress', function(e) {
    Ti.API.info(JSON.stringify(e));
  });
  push.addEventListener('stopped', function(e) {
    cb && cb(null, e);
  });
  push.start();  
};

var pull;
exports.pullFromServer = function(cb) {
  pull = db.pullFromURL('http://touchbooks.iriscouch.com/books');
  pull.addEventListener('progress', function(e) {
    Ti.API.info(JSON.stringify(e));
  });
  pull.addEventListener('stopped', function(e) {
    cb && cb(null, e);
  });
  pull.start();  
}

// Copyright 2015 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Construct a fake for localforage.
var localforage = new (class {
  constructor() {
    this.storage_ = {};
    this.isFake = true;
    this.willError = false;
  }

  getItem(key, callback) {
    if (callback) {
      if (this.willError)
        throw 'get error';
      callback(this.storage_[key] || null);
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('get error');
        resolve(this.storage_[key] || null);
      });
    }
  }

  setItem(key, value, callback) {
    if (callback) {
      if (this.willError)
        throw 'set error';
      this.storage_[key] = value;
      callback(this.storage_[key] || null);
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('set error');

        this.storage_[key] = value;
        resolve();
      });
    }
  }

  removeItem(key, callback) {
    if (callback) {
      if (this.willError)
        throw 'remove error';
      delete this.storage_[key];
      callback();
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('remove error');
        delete this.storage_[key];
        resolve();
      });
    }
  }

  clear(callback) {
    if (callback) {
      if (this.willError)
        throw 'clear error';
      this.storage_ = {};
      callback();
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('clear error');
        this.storage_ = {};
        resolve();
      });
    }
  }

  length(callback) {
    if (callback) {
      if (this.willError)
        throw 'length error';
      callback(Object.keys(this.storage_).length);
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('length error');
        resolve(Object.keys(this.storage_).length);
      });
    }
  }

  key() {
    throw 'not implemented';
  }

  keys(callback) {
    if (callback) {
      if (this.willError)
        throw 'keys error';
      callback(Object.keys(this.storage_));
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          throw 'keys error';
        resolve(Object.keys(this.storage_));
      });
    }
  }

  iterate(iterCallback, callback) {
    if (callback && this.willError)
      throw 'iterate error';

    var v = undefined;
    if (!this.willError) {
      var i = 0;
      for (var key in this.storage_) {
        v = iterCallback(this.storage_[key], key, i);
        if (v)
          break;
        i++;
      }
    }
    if (callback) {
      callback(v);
    } else {
      return new Promise((resolve, reject) => {
        if (this.willError)
          reject('iterate error');
        resolve(v);
      });
    }
  }
})();

var sandbox = sinon.sandbox.create();

QUnit.module('storage', {
    beforeEach: function () {
      localforage.setItem('test1', 123);
      localforage.setItem('test2', '456');
      sandbox.stub(caterpillar_, 'setError');
    },
    afterEach: function() {
      sandbox.restore();
      localforage.willError = false;
      localforage.clear();
      caterpillar_.storage.resetOnChangedListenersForTests();
    }
});

// All storage areas are assumed to be the same in this polyfill.
QUnit.test('all storage areas are the same', assert => {
  assert.ok(chrome.storage.sync === chrome.storage.local &&
            chrome.storage.local === chrome.storage.managed)
});

QUnit.test('get sends errors to caterpillar when retrieving all items',
    function(assert) {
      var done = assert.async();
      localforage.willError = true;
      chrome.storage.local.get(function() {
        assert.ok(caterpillar_.setError.calledOnce);
        assert.equal(caterpillar_.setError.args[0][0],
                     'Error retrieving values: iterate error');
        done();
      });
    }
);

QUnit.test('get sends errors to caterpillar when retrieving one item',
    function(assert) {
      var done = assert.async();
      localforage.willError = true;
      chrome.storage.local.get('test1', function() {
        assert.ok(caterpillar_.setError.calledOnce);
        assert.equal(caterpillar_.setError.args[0][0],
                     'Error retrieving values: get error');
        done();
      });
    }
);

QUnit.test('get sends errors to caterpillar when retrieving many items',
    function(assert) {
      var done = assert.async();
      localforage.willError = true;
      chrome.storage.local.get(['test1', 'test2'], function() {
        assert.ok(caterpillar_.setError.calledOnce);
        assert.equal(caterpillar_.setError.args[0][0],
                     'Error retrieving values: get error');
        done();
      });
    }
);

QUnit.test(
    'get sends errors to caterpillar when retrieving items with defaults',
    function(assert) {
      var done = assert.async();
      localforage.willError = true;
      chrome.storage.local.get({'notakey': 'test'}, function() {
        assert.ok(caterpillar_.setError.calledOnce);
        assert.equal(caterpillar_.setError.args[0][0],
                     'Error retrieving values: get error');
        done();
      });
    }
);

QUnit.test('get can get all key value pairs', function(assert) {
  var done = assert.async();
  chrome.storage.local.get(function(items) {
    assert.strictEqual(items['test1'], 123);
    assert.strictEqual(items['test2'], '456');
    done();
  });
});

QUnit.test('get can get one key value pair', function(assert) {
  var done = assert.async();
  chrome.storage.local.get('test1', function(items) {
    assert.strictEqual(items['test1'], 123);
    done();
  });
});

QUnit.test('get can get many key value pairs', function(assert) {
  var done = assert.async();
  chrome.storage.local.get(['test1', 'test2'], function(items) {
    assert.strictEqual(items['test1'], 123);
    assert.strictEqual(items['test2'], '456');
    done();
  });
});

QUnit.test('get can get key value pairs with defaults', function(assert) {
  var done = assert.async();
  chrome.storage.local.get({'notakey': 'default'}, function(items) {
    assert.strictEqual(items['notakey'], 'default');
    done();
  });
});

QUnit.test('getBytesInUse sets an error', function(assert) {
  var done = assert.async();
  chrome.storage.local.getBytesInUse([], function() {
    assert.equal(caterpillar_.setError.args[0][0],
                 'getBytesInUse not implemented.');
    done();
  });
});

QUnit.test('getBytesInUse juggles arguments', function(assert) {
  var done = assert.async();
  chrome.storage.local.getBytesInUse(done);
  assert.expect(0);
});

QUnit.test('can set key/value pairs', function(assert) {
  var done = assert.async();
  chrome.storage.local.set({'hello': 'world', 'test': 123}, function() {
    localforage.getItem('hello')
        .then(function(value) {
          assert.strictEqual(value, 'world');
          return localforage.getItem('test');
        })
        .then(function(value) {
          assert.strictEqual(value, 123);
          done();
        });
  });
});

QUnit.test('can remove a single item', function(assert) {
  var done = assert.async();
  chrome.storage.local.remove('test1', function() {
    localforage.getItem('test1').then(function(value) {
      assert.strictEqual(value, null);
      done();
    });
  });
});

QUnit.test('can remove multiple items', function(assert) {
  var done = assert.async();
  chrome.storage.local.remove(['test1', 'test2'], function() {
    localforage.getItem('test1')
        .then(function(value) {
          assert.strictEqual(value, null);
          return localforage.getItem('test2');
        })
        .then(function(value) {
          assert.strictEqual(value, null);
          done();
        });
  });
});

QUnit.test('can clear all items', function(assert) {
  var done = assert.async();
  chrome.storage.local.clear(function() {
    localforage.getItem('test1')
        .then(function(value) {
          assert.strictEqual(value, null);
          return localforage.getItem('test2');
        })
        .then(function(value) {
          assert.strictEqual(value, null);
          done();
        });
  });
});

QUnit.test('set runs onChanged handlers', function(assert) {
  var done = assert.async();
  chrome.storage.onChanged.addListener(function(changes) {
    assert.strictEqual(changes['test1'].oldValue, 123);
    assert.strictEqual(changes['test1'].newValue, 'hello');
    done();
  });
  chrome.storage.local.set({'test1': 'hello'});
});

QUnit.test('set runs multiple onChanged handlers', function(assert) {
  assert.expect(0);
  var done = assert.async(2);
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.local.set({'test1': 'hello'});
});

QUnit.test('removing 1 key runs onChanged handlers', function(assert) {
  var done = assert.async();
  chrome.storage.onChanged.addListener(function(changes) {
    assert.strictEqual(changes['test1'].oldValue, 123);
    assert.strictEqual(changes['test1'].newValue, null);
    done();
  });
  chrome.storage.local.remove('test1');
});

QUnit.test('removing 1 key runs multiple onChanged handlers', function(assert) {
  assert.expect(0);
  var done = assert.async(2);
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.local.remove('test1');
});

QUnit.test('removing multiple keys runs onChanged handlers', function(assert) {
  var done = assert.async();
  chrome.storage.onChanged.addListener(function(changes) {
    assert.strictEqual(changes['test1'].oldValue, 123);
    assert.strictEqual(changes['test1'].newValue, null);
    assert.strictEqual(changes['test2'].oldValue, '456');
    assert.strictEqual(changes['test2'].newValue, null);
    done();
  });
  chrome.storage.local.remove(['test1', 'test2']);
});

QUnit.test('removing multiple keys runs multiple onChanged handlers',
    function(assert) {
      assert.expect(0);
      var done = assert.async(2);
      chrome.storage.onChanged.addListener(function(changes) {
        done();
      });
      chrome.storage.onChanged.addListener(function(changes) {
        done();
      });
      chrome.storage.local.remove('test1');
    }
);

QUnit.test('clearing runs onChanged handlers', function(assert) {
  var done = assert.async();
  chrome.storage.onChanged.addListener(function(changes) {
    assert.strictEqual(changes['test1'].oldValue, 123);
    assert.strictEqual(changes['test1'].newValue, null);
    assert.strictEqual(changes['test2'].oldValue, '456');
    assert.strictEqual(changes['test2'].newValue, null);
    done();
  });
  chrome.storage.local.clear();
});

QUnit.test('clearing runs multiple onChanged handlers', function(assert) {
  assert.expect(0);
  var done = assert.async(2);
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.onChanged.addListener(function(changes) {
    done();
  });
  chrome.storage.local.clear();
});

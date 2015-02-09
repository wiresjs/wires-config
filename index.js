//    Nice-config.js 0.0.1

//    (c) 2015 Orlov Ivan
//    Nice-config may be freely distributed under the MIT license.
//    For all details and documentation check README.md


var _ = require('lodash');
var Class = require('wires-class');
var fs = require('fs');
var lineReader = require('line-reader');

var getObjectFromXPath = function(data, xpath, defaultValues) {
    var x = xpath.split('.');
    var target = data;
    _.each(x, function(key) {
        if (target[key]) {
            target = target[key];
        } else {
            target = defaultValues;
            return false;
        }
    });
    return target;
}

// The main Token interface
var Token = Class.extend({
    initialize: function() {},
    receive: function(symbol) {},

}, {
    isStartToken: function() {
        return false
    }
})

// String handler
// Takes token as a second argument
// Considers done if the end token is the same as the starting one
var StringHandler = Token.extend({
    initialize: function(conf, token) {
        this.value = [];
        this.name = 'string'
        this.token = token;
    },
    receive: function(symbol) {
        if (symbol === this.token) {
            this.value = this.value.join('');
            return {
                done: true,
                waiting: false
            }
        } else {
            this.value.push(symbol)
            return {
                waiting: false
            }
        }
    },

}, {
    isStartToken: function(symbol) {
        return symbol === "'" || symbol === '"';
    }
})

var BooleanHandler = Token.extend({
    initialize: function(conf, token) {
        this.value = [token];

        // False
        this.expectedLength = 5;
        // true
        if (this.value[0] === "t") {
            this.expectedLength = 4;
        }

        this.name = 'string'
        this.token = token;
    },
    receive: function(symbol) {
        var allowed = ['r', 'u', 'e', 'a', 'l', 's']
        if (_.indexOf(allowed, symbol) > -1) {
            this.value.push(symbol);
        } else {
            this.value = false
            return {
                done: true,
                waiting: false
            }
        }


        var done = false;

        if (this.value.length === this.expectedLength) {
            var word = this.value.join('');
            if (this.token === "t") {
                this.value = word === 'true' ? true : false
            }
            if (this.token === "f") {
                this.value = word === 'false' ? false : false
            }
            if (!_.isBoolean(this.value)) {
                this.value = word;
            }
            done = true;
        }

        return {
            done: done,
            waiting: false
        }

    },

}, {
    isStartToken: function(symbol) {
        return symbol === "t" || symbol === 'f';
    }
})


// IntegerHandler
// Simple creates integers
// Returns revalidate : true for other tokens to try the failed symbol
var IntegerHandler = Token.extend({
    initialize: function(conf, token) {
        this.value = [token];
        this.name = 'integer'
        this.token = token;
    },
    receive: function(symbol) {
        if (/\d/.test(symbol)) {
            this.value.push(symbol)
            return {
                done: false,
                waiting: false
            }
        } else {
            this.value = parseInt(this.value.join(''));
            return {
                done: true,
                waiting: false,
                revalidate: true
            }
        }
    },
    addValue: function(v) {}
}, {
    isStartToken: function(symbol) {
        return /\d/.test(symbol);
    }
})


// ArrayHandler
// The easiest, Array can contain only other objects
// So it checkes only start and end token match
var ArrayHandler = Token.extend({
    initialize: function(conf, token) {
        this.value = [];
        this.name = 'array'
    },
    receive: function(symbol) {
        if (symbol === "]") {
            return {
                done: true,
                waiting: false
            }
        }
        return {
            done: false,
            waiting: true
        }

    },
    addValue: function(v) {
        this.value.push(v);
    }
}, {
    isStartToken: function(symbol) {
        return symbol === "[";
    }
})


var EnvHandler = Token.extend({
    initialize: function(conf, token, env) {
        this.value = [];
        this.name = 'env'
        this.env = env;
    },
    receive: function(symbol) {

        if (/[a-zA-Z0-9_.]/.test(symbol)) {
            this.value.push(symbol);
            return {
                waiting: false
            }
        } else {
            this.value = getObjectFromXPath(this.env, this.value.join(''));
            return {
                done: true,
                waiting: false,
                revalidate: true
            }
        }
    },
    addValue: function(v) {

    }
}, {
    isStartToken: function(symbol) {
        return symbol === "$";
    }
})


// THe heart of the programm
// The entire config is a large dictionary
// So everything revolves around this object
var DictionaryHandler = Token.extend({
    initialize: function(dict) {
        this.value = dict || {};
        this.key = [];
        this.stack = [];
        this.name = 'dict'
        this.waiting = false;
    },
    setValue: function(val) {
        var self = this;
        var prop = this.value;

        _.each(this.stack, function(item, index) {
            if (!prop[item]) {
                var next = {};
                prop[item] = next;
            }
            if (index == self.stack.length - 1) {
                prop[item] = val;
            } else {
                prop = prop[item];
            }
        });
    },
    // Called when some handler finished it's job
    // Then here releasing waiting and continue parsing dictionary
    addValue: function(data) {

        this.setValue(data);
        this.stack = [];
        this.waiting = false;
    },
    receive: function(symbol) {

        // If dict is already waiting for the value
        // We don't do anything, cuz doing it will screw defined keys
        // So we are just waiting for a valid object passed to addValue
        if (this.waiting === true) {
            return {
                waiting: true
            };
        }

        // The dictionary closed
        if (symbol === "}") {
            return {
                done: true
            };
        }

        var done = false;
        var revalidate = false;

        // Should not allow dot notation yet
        if (this.key.length > 0) {

            if (/[a-zA-Z0-9_]/.test(symbol) === false) {}
            if (symbol === ".") {
                this.stack.push(this.key.join(''))
                this.key = [];

            }

            if (/[a-zA-Z0-9_.]/.test(symbol) === false) {
                this.waiting = true;
                revalidate = true;
                this.stack.push(this.key.join(''))
                this.key = [];
            }
        }
        // Valid dict name comes to be tested
        if (/[a-zA-Z0-9_]/.test(symbol)) {
            this.key.push(symbol);
        }
        return {
            waiting: this.waiting,
            done: done,
            revalidate: true
        };
    },
}, {
    isStartToken: function(symbol) {
        return symbol === "{";
    }
})


var handlers = [
    DictionaryHandler,
    ArrayHandler,
    StringHandler,
    IntegerHandler,
    EnvHandler,
    BooleanHandler
]


var Config = Class.extend({
    initialize: function(env) {
        this.env = env || {}
    },
    load: function(fname, ready) {
        var self = this;

        this.data = {};
        this.ready = ready;
        this.operations = [];
        // Add Dictionary operator right away
        this.operations.push(new DictionaryHandler(this.data))

        if (ready) {
            lineReader.eachLine(fname, function(line, last) {
                self.onLine(line);
                if (last) {
                    self.onDone();
                }
            })
        } else {
            var lines = fs.readFileSync(fname).toString();

            var lns = lines.split("\n");
            for (var i in lns) {
                this.onLine(lns[i]);
            }
            this.onDone();
        }
        return this;
    },
    symbolRecevied: function(symbol) {
        var self = this;

        var current = this.operations[this.operations.length - 1];
        if (!current) {
            console.error(" --> Config file error")
            process.exit(1)
            return;
        }
        var status = current.receive(symbol)
        if (status.done) {
            if (!status.ignore) {
                var prev = this.operations[this.operations.length - 2];
                if (prev) {
                    prev.addValue(current.value)
                }
            }
            this.operations.pop();

            // If handler does not have conventional stop token
            // It might happen that this sybmol that actually caused current handler to break
            // gives "life" to a new handler
            // For example test.a = 1test.b = 2
            // Gives "test": { "a": 1, "b": 2 }
            if (status.revalidate) {
                this.symbolRecevied(symbol)
            }
        }
        // Checking if we have a new handler 
        if (status.waiting) {
            // Searching for next candidate
            _.each(handlers, function(hndl) {

                if (hndl.isStartToken(symbol)) {

                    var handler = new hndl(self.config, symbol, self.env);

                    self.operations.push(handler)
                    return false;
                }
            });
        }
    },
    onLine: function(line) {
        var self = this;
        var ignore = false;
        for (var i in line) {
            var symbol = line[i];

            // Comments handled here
            if (ignore && (symbol === "#" || symbol === "\n")) {
                ignore = false;
            } else {
                if (symbol === "#") {
                    ignore = true;
                }
            }
            // If we are receiving 
            if (ignore === false) {
                this.symbolRecevied(symbol);
            }
        }
        this.symbolRecevied('\n');
    },
    onDone: function() {
        if (this.ready) {
            this.ready(this.data);
        }
        this.trigger('ready', this.data)
    },

    // Searching a particular value using xpath
    // If value is not found uses defaultValues object if present
    // Returns undefined if data was not found and default values are not provided
    get: function(xpath, defaultValues) {
        return getObjectFromXPath(this.data, xpath, defaultValues);
    }
});
module.exports = Config;
/*
var cfg = new Config({
    pukka: {
        sukka: 'yeah i am sukka'
    }
});

var data = cfg.load('./test.conf');
console.log(cfg.get('domain.adapter.type'))
console.log(JSON.stringify(data.data, 0, 3))*/

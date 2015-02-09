# wires-config

Initially created to simplify access to configs. The syntax is easy, supports dot notations, and gives a nice APi for accessing values


## Config sample

    app.port = 3000
    db.adapter.type = 'mysql'
    db.adapter.opts
    {
      host        : 'localhost'
      user        : 'root'
      password    : ''
      database    : 'domain'
      sync        :  {
    	  test.a  : 1
    	  test.b  : 'some'
      }
    }

Transforms into javascript object:

    {
    "app": {
       "port": 3000
    },
    "db": {
       "adapter": {
         "type": "mysql",
         "opts": {
            "host": "localhost",
            "user": "root",
            "password": "",
            "database": "domain",
            "sync": {
               "test": {
                  "a": 1,
                  "b": "some"
               }
            }
         }
       }
     }
    }

## How to use

### Synchronous reading

    var cfg = new Config();
    var config = cfg.load('./test.conf');
    
    
### Asynchronous reading

In case if the file is huge, you can do that:

    new Config().load('./test.conf', function(c){
        console.log(c.data);
    });
    
### Setting up environment variables
In case if you need to pass some objects to your config, to you can define them in Config constuctor
   
    var cfg = new Config({
       var1: "Some stuff here",
       var2: 2
    });
    
And you config may look like this
    
    app.test.data = [ $var1 $var2 ]
    
And the output

    {
     "app": {
      "test": {
       "data": [
        "Some stuff here",
        2
       ]
      }
     }
    }
    
### Default values

API has a very convinient method get, which returns default value if object in the config is missing

    c.get('app.port', 8080)

### Comments

Parser ignores everything that has a starting hashtag token. It ends with new line, or another hashtag 

    app.port = 8080 # This is comment
    app.logs = true # This is another comment # app.something = 'very important' # Very important



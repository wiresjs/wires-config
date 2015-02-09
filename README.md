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

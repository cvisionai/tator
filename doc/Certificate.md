# Generate a debug SSL certificate

## The command to use is:

```
openssl ecparam -name secp521r1 -genkey -param_enc explicit -out private-key.pem
openssl req -new -x509 -key private-key.pem -out server.pem -days 4000
```

Follow the prompts and put in entertaining things for everything but CN (common name) which should be hostname of the development server.


## convert pem to crt for django
```
openssl x509 -in server.pem -outform der server.crt
```

## to dump info on the key:

```
openssl x509 -in server.pem -text -noout 
openssl x509 -in server.crt -text -noout 
```

## Firefox/chrome

The first time we access the dev server, you'll have to authorize the key. 

# Install Certbot

**[Certbot Install Guide](https://certbot.eff.org/lets-encrypt/ubuntubionic-nginx)**

* Add Certbot PPA

```
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
```

* Install Certbot

```
sudo apt-get install certbot python-certbot-nginx
```

* Get the certificate

```
sudo certbot -d <domain> --manual –preferred-challenges dns certonly
```

* ‘Please deploy a DNS TXT record under the name xxxxxxxxxxxxxxxxxxxxxxxxx’ displays
* Open a new browser window and enter the following into the address bar:
    * https://www.duckdns.org/update?domains=<domain_name_only>&token=<your_token_value>&txt=<DNS_TXT_value>
    * OK should appear in your browser
* Navigate back to SSH, hit enter
* Certificate has been issued

**Note: If you were unable to acquire certificate after following the steps above, install Certbot-Auto and repeat step 4.**

* Certbot-auto installation steps:

```
wget https://dl.eff.org/certbot-auto
sudo mv certbot-auto /usr/local/bin/certbot-auto
sudo chown root /usr/local/bin/certbot-auto
sudo chmod 0755 /usr/local/bin/certbot-auto
```

## Real Secrets

* Open another command window and copy the example secrets file to the real secrets file.

```
cp k8s/example-secrets.yaml k8s/real-secrets.yaml
```

* Update TATOR_SECRET_POSTGRES_USER
* Update TATOR_SECRET_POSTGRES_PASSWORD
* Update TATOR_SECRET_DOCKER_USERNAME: `<your Docker username>`
* Update TATOR_SECRET_DOCKER_PASSWORD: `<your Docker password>`
* Copy certificate information from other command window into the real-secrets.yaml file.

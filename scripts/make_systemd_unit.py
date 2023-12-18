#!/usr/bin/python3
import os
import os

# $> python3 scripts/make_systemd_unit.py  > tatorRestart.service
# $> sudo mv tatorRestart.service /etc/systemd/system/
# $> sudo systemctl daemon-reload
# $> sudo systemctl enable tatorRestart.service
# $> sudo systemctl start tatorRestart.service
# $> verify on reboot that tator is running! 

template="""
[Unit]
Description=Restart docker compose tator install
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash {path}/scripts/restart_docker.sh {path} {user}
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
"""

if __name__=="__main__":
    username = os.getlogin()
    path = os.getcwd()
    print(template.format(path=path,user=username))
    

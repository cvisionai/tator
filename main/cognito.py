import os
from urllib.parse import urlsplit, urlunsplit

import yaml
import boto3

class TatorCognito:
    """Interface for cognito.
    """
    @classmethod
    def setup_cognito(cls):
        if os.getenv('COGNITO_ENABLED') == 'TRUE':
            with open('/cognito/cognito.yaml', 'r') as f:
                cls.config = yaml.safe_load(f)
            cls.cognito = boto3.client('cognito-idp',
                                        region_name=cls.config['aws-region'],
                                        aws_access_key_id=cls.config['access-key'],
                                        aws_secret_access_key=cls.config['secret-key'])

    def create_user(self, user):
        response = self.cognito.admin_create_user(UserPoolId=self.config['pool-id'],
                                                  UserName=user.username,
                                                  UserAttributes=[{
                                                     'Name': 'email_verified',
                                                     'Value': False,
                                                  }, {
                                                     'Name': 'email',
                                                     'Value': user.email,
                                                  }, {
                                                     'Name': 'given_name',
                                                     'Value': user.first_name,
                                                  }, {
                                                     'Name': 'family_name',
                                                     'Value': user.last_name,
                                                  }])
        return response

TatorCognito.setup_cognito()

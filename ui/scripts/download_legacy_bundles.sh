basenames=(
  "tator-ui"
  "project-settings"
  "project-detail"
  "organization-settings"
  "password-reset"
  "annotation"
  "organizations"
  "account-profile"
  "token"
  "projects"
  "util"
  "registration"
  "components"
  "portal"
  "third-party"
)
mkdir -p legacy
for basename in "${basenames[@]}"; do
  wget -O "legacy/${basename}.js" "https://tator-ci.s3.us-east-1.amazonaws.com/bundles_1-3-12/${basename}.js"
  wget -O "legacy/${basename}.css" "https://tator-ci.s3.us-east-1.amazonaws.com/bundles_1-3-12/${basename}.css"
done

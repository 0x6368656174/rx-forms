FROM node:10-slim

LABEL version="1.0.0"
LABEL repository="http://github.com/0x6368656174/rx-forms"
LABEL homepage="http://github.com/actions"
LABEL maintainer="Pavel Puchkov <0x6368656174@gmail.com>"

LABEL com.github.actions.name="Lint, Build and Publish"
LABEL com.github.actions.description="Lint, Build and Publish with semantic-release"
LABEL com.github.actions.icon="package"
LABEL com.github.actions.color="red"

RUN apt-get update
RUN apt-get install -y git
RUN npm install -g semantic-release @semantic-release/git @semantic-release/npm @semantic-release/changelog fs-extra tar

COPY "entrypoint.sh" "/entrypoint.sh"
ENTRYPOINT ["/entrypoint.sh"]

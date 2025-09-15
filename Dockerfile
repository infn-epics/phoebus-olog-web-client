
FROM node:22.13.1-alpine AS build

RUN apk add --no-cache git shadow
ARG VITE_APP_BASE_URL=/Olog
ENV VITE_APP_BASE_URL=${VITE_APP_BASE_URL}
ENV VITE_APP_LEVEL_VALUES='["Normal","Shift Start","Shift End","Fault","Beam Loss","Beam Configuration","Crew","Expert Intervention Call","Incident"]'
ENV VITE_APP_DEFAULT_LEVEL="Normal"
WORKDIR /usr/src/phoebus-olog-web-client
COPY . .
RUN npm ci
RUN npm run build --force

#FROM node:22.13.1-alpine
#RUN apk add --no-cache sudo shadow
#COPY --from=build /usr/src/phoebus-olog-web-client/build/ /usr/src/phoebus-olog-web-client/build/
#WORKDIR /usr/src/phoebus-olog-web-client/
EXPOSE 3000
RUN npm install -g serve
ARG USER_ID=epics
ARG USER_UID=1000
ARG GROUP_ID=control
ARG GROUP_UID=1000

RUN usermod -l epics node && groupmod -n control node
    
    

RUN chown -R ${USER_UID}:${GROUP_UID} .


USER ${USER_ID}


CMD ["serve", "-p", "3000", "-s", "build"]

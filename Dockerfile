FROM alpine:3.12
RUN apk update 

RUN apk add git perl unzip gcc build-base libgcc make pkgconf pkgconfig openssl openssl-dev pcre pcre-dev zlib zlib-dev
RUN git clone https://github.com/sergey-dryabzhinsky/nginx-rtmp-module.git
RUN wget http://nginx.org/download/nginx-1.20.1.tar.gz && tar -xf nginx-1.20.1.tar.gz && tar -xf nginx-1.20.1.tar.gz
RUN cd nginx-1.20.1 && pwd && ls -l && ./configure --prefix=/usr/local/nginx --with-http_ssl_module --add-module=../nginx-rtmp-module && make && make install

RUN apk add stunnel
RUN apk add --update nodejs npm

ADD package*.json /app/
RUN cd /app && npm install

RUN mkdir /app/nginx-rtmp/
ADD nginx-rtmp.conf /app/
RUN echo "include /app/nginx-rtmp.conf;" >> /usr/local/nginx/conf/nginx.conf
RUN sed -i 's/worker_processes  1;/worker_processes  auto;/' /usr/local/nginx/conf/nginx.conf
RUN /usr/local/nginx/sbin/nginx -t

ADD . /app
RUN chmod +x /app/startup.sh

WORKDIR /app
ENTRYPOINT "./startup.sh"

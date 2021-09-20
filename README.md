
To build docker image

    docker build -t nginx-rtmp-proxy .
  
To run docker as debug

    docker run -it --rm -p 3000:3000 -p 19350:1935 -e PUBLIC_DOMAIN=rtmp://ip:port -e USER=user -e PASSWORD=password -e MAX_DURATION=8 vienntgs/nginx-rtmp-proxy

To run docker in background

    docker run -d --rm -p 3000:3000 -p 19350:1935 -e PUBLIC_DOMAIN=rtmp://ip:port -e USER=user -e PASSWORD=password -e MAX_DURATION=8 vienntgs/nginx-rtmp-proxy

Register new session

    curl --location --request POST 'http://user:password@localhost:3000/register' --header 'Content-Type: application/json' -d '{"streamId":"123456", "broadcast": ["rtmps://live-api-s.facebook.com:443/rtmp/xxx", "rtmps://live-api-s.facebook.com:443/rtmp/FB-yyy"]}'

If you want to record live stream, create a folder and mount it to /app/recoreded of docker container. Remember to chmod 777 for this forder both in container and in host machine

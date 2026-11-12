## Deployment

docker compose up -d --scale student=5

Then access the various services at `localhost:80`

Various routes:


* /student1/

* /static-web-studentX/

This endpoint can also be reached via `http://bitcoin-student-X:8000/` from inside the environment. 

* /mempool/

* /btc-explorer/



## Integration

The environment is intended to be run with an outer nginx 
router that routes `/labs/bitcoin` to this lab. If you'd
like to use without it, uncomment the lines in the 
`docker-compose.yml` and `nginx.conf` files to 
enable TLS directly. Make sure you also expose 443. 

The benefit of the outer nginx is that you can
host multiple labs at once. Otherwise, the
instructor must `docker-compose down` and
`docker compose up -d` each time you switch labs.

The downside of the outer proxy is that some
resources are wired to use the root path
of the server and must be manually patched
or nginx has to forward those routes directly.
If more than one lab uses these routes, 
both labs can't be run at the same time. 

If you change where the root path is for
the labs, you will need to update the `docker-compose.yml` file:

```
      BTCEXP_BASEURL: "/labs/bitcoin/btc-explorer/"
```
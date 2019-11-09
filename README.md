# allanbendy.com

## Setup to develop

```sh
yarn install
yarn run dev
```

## Build & deploy

```sh
yarn run build
```

## Set cache on S3 objects

```sh
s3cmd --recursive modify --add-header="Cache-Control:max-age=0" s3://allanbendy.com/
```

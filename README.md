# BulletBot

This is a bot for the CodeBullet server

# Coding Style

To make the code more readable to uniform we have coding style rules

## naming

camelCase for everything, except constant variables. Constant variables like PI will be written in uppercase. Imports just by the actual package name.

## for loops

``` JavaScript
for (i = 0; i < 5; i++) {
  x += i;
}
```

`i` can also be `i[something]`

## simple statements

always put `;` behind simple statement

## arguments

if function requires following arguments, put them at the front in this order:

1. `bot`
2. `guild`
3. `user`
4. `member`
5. `role`
6. `channel`
7. `message`
8. `content`

if you don't know what certain part means look [here](https://www.w3schools.com/JS/js_conventions.asp)
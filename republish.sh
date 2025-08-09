#!/bin/bash

DEST=~/github/annolangen.github.io/comments

rm -rf dist .parcel-cache $DEST/*
npm run build
cp -r dist/* $DEST
cd $DEST/..
git add .
git commit -m 'Republish comments'
git push

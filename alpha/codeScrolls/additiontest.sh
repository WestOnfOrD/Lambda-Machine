#!/bin/bash

x=1

while [ $x -le 1000 ]
do
	x=$((x+x))
	echo "$x"
done
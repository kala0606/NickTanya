#!/bin/bash

# Rename files in Strings1 directory
for file in samples/Strings1/*#*; do
    if [ -f "$file" ]; then
        newname=$(echo "$file" | sed 's/#/s/g')
        mv "$file" "$newname"
    fi
done

# Rename files in Sustain directory
for file in samples/Sustain/*#*; do
    if [ -f "$file" ]; then
        newname=$(echo "$file" | sed 's/#/s/g')
        mv "$file" "$newname"
    fi
done 
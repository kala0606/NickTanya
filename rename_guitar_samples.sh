#!/bin/bash

# Script to rename guitar sample files by removing spaces from filenames
echo "Renaming guitar sample files to remove spaces..."

cd samples/guitar

# Rename all files with spaces in their names
for file in *\ *; do
    if [ -f "$file" ]; then
        # Remove all spaces from filename
        newname=$(echo "$file" | tr -d ' ')
        echo "Renaming: $file -> $newname"
        mv "$file" "$newname"
    fi
done

echo "Guitar sample files renamed successfully!" 
#!/bin/sh
./mwmatrixoffliner.js --mwUrl=http://meta.wikimedia.org/ --parsoidUrl=http://parsoid-lb.eqiad.wikimedia.org/ --project=wikivoyage  --outputDirectory=/var/www/zimfarm.kiwix.org/upload/zim2index/wikivoyage/
./mwmatrixoffliner.js --mwUrl=http://meta.wikimedia.org/ --parsoidUrl=http://parsoid-lb.eqiad.wikimedia.org/ --project=wikinews    --outputDirectory=/var/www/zimfarm.kiwix.org/upload/zim2index/wikinews/
./mwmatrixoffliner.js --mwUrl=http://meta.wikimedia.org/ --parsoidUrl=http://parsoid-lb.eqiad.wikimedia.org/ --project=wikiquote   --outputDirectory=/var/www/zimfarm.kiwix.org/upload/zim2index/wikiquote/
./mwmatrixoffliner.js --mwUrl=http://meta.wikimedia.org/ --parsoidUrl=http://parsoid-lb.eqiad.wikimedia.org/ --project=wikiversity --outputDirectory=/var/www/zimfarm.kiwix.org/upload/zim2index/wikiversity/
./mwmatrixoffliner.js --mwUrl=http://meta.wikimedia.org/ --parsoidUrl=http://parsoid-lb.eqiad.wikimedia.org/ --project=wikibooks   --outputDirectory=/var/www/zimfarm.kiwix.org/upload/zim2index/wikibooks/
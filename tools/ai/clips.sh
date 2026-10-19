#!/bin/zsh
# Veo clips for the cast: name start end. Prompt = prompts/clips/<name>.txt + common.txt. Output tools/ai/out/clips/<name>.mp4
cd "${0:A:h}/../.."
P=tools/ai/prompts/clips; K=tools/ai/out/k; T=$(mktemp -d)
typeset -A START END
START=(in enter-green meet park-green idle park-green namaste park-green eng-approach park-green eng-act eng-a-green eng-leave eng-b-green
       haldi-approach park-green haldi-act haldi-a-green haldi-leave haldi-b-green wed-approach park-green jaimala jai-a-green
       bridge jai-b-green phera phera-a-green finale phera-a-green jai1 jai-a-green jai2 jai-m-green)
END=(in park-green meet meet-green idle park-green namaste park-green eng-approach eng-a-green eng-act eng-b-green eng-leave park-green
     haldi-approach haldi-a-green haldi-act haldi-b-green haldi-leave park-green wed-approach jai-a-green jaimala jai-b-green
     bridge phera-a-green phera phera-a-green finale finale-green jai1 jai-m-green jai2 jai-b-green)
for n in "$@"; do
  ( cat $P/$n.txt $P/common.txt > $T/$n.txt
    python3 tools/ai/gemini.py video clips/$n $T/$n.txt --model ${MODEL:-veo-3.1-generate-preview} --start $K/$START[$n].png --end $K/$END[$n].png > $T/$n.log 2>&1 && echo "ok $n" || { echo "FAIL $n"; tail -c 400 $T/$n.log; } ) &
done
wait

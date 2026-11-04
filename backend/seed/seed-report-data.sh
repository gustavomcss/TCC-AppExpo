#!/usr/bin/env bash
# Fills fuels, oils and repairs with demo records spread over the last months, for the charts of
# the financial report. It only creates records (it never deletes). Needs the superuser and the
# hook seed/seed_backdate.pb.js copied into backend/pb_hooks while it runs.
#
#   PB_URL        server (default https://pb.wizecode.com.br)
#   SU_EMAIL      superuser e-mail (asked if empty); the password is asked, never stored
#   MONTHS        how many months, counting this one (default 6)
#   MIN_VEHICLES  active vehicles wanted; demo vehicles DEM-xAxx are created to reach it (default 7)
#   DRY_RUN=1     only prints what would be created
set -euo pipefail

PB_URL="${PB_URL:-https://pb.wizecode.com.br}"
MONTHS="${MONTHS:-6}"
MIN_VEHICLES="${MIN_VEHICLES:-7}"
DRY_RUN="${DRY_RUN:-0}"
RANDOM=42 # fixed seed: the same run gives the same data

if [ -z "${SU_EMAIL:-}" ]; then read -r -p "E-mail do superusuário: " SU_EMAIL; fi
if [ -z "${SU_PASS:-}" ]; then read -r -s -p "Senha do superusuário: " SU_PASS; echo; fi

TOKEN=$(curl -sS --fail-with-body "$PB_URL/api/collections/_superusers/auth-with-password" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg i "$SU_EMAIL" --arg p "$SU_PASS" '{identity:$i,password:$p}')" | jq -r .token)
unset SU_PASS

api() { # api METHOD PATH [JSON]
    curl -sS --fail-with-body -X "$1" "$PB_URL$2" -H "Authorization: $TOKEN" \
        -H 'Content-Type: application/json' ${3:+-d "$3"}
}

list() { # list COLLECTION FILTER FIELDS
    curl -sS --fail-with-body -G "$PB_URL/api/collections/$1/records" -H "Authorization: $TOKEN" \
        --data-urlencode "filter=$2" --data-urlencode "fields=$3" --data-urlencode perPage=200
}

mapfile -t USERS < <(list users 'active = true' id | jq -r '.items[].id')
[ "${#USERS[@]}" -gt 0 ] || { echo "Nenhum usuário ativo." >&2; exit 1; }

VEHICLES_JSON=$(list vehicles 'active = true' id,plate,type,odometer | jq -c '.items')
COUNT=$(jq length <<<"$VEHICLES_JSON")
echo "Veículos ativos: $COUNT (quero $MIN_VEHICLES)."

TYPES=(carro moto caminhao van carro moto van)
MODELS=(Onix CG-160 Actros Master Hilux XRE-300 Sprinter)
n=0
while [ "$COUNT" -lt "$MIN_VEHICLES" ] && [ "$n" -lt 40 ]; do
    n=$((n + 1))
    plate=$(printf 'DEM-%dA%02d' $((n % 9 + 1)) "$n")
    k=$((COUNT % ${#TYPES[@]}))
    body=$(jq -n --arg p "$plate" --arg t "${TYPES[$k]}" --arg m "${MODELS[$k]}" \
        '{plate:$p,type:$t,model:$m,odometer:30000,active:true}')
    if [ "$DRY_RUN" = 1 ]; then echo "[dry] veículo $plate"; COUNT=$((COUNT + 1)); continue; fi
    if created=$(api POST /api/collections/vehicles/records "$body" 2>/dev/null); then
        echo "Veículo de demonstração criado: $plate (${TYPES[$k]})"
        VEHICLES_JSON=$(jq -c --argjson v "$created" '. + [$v | {id,plate,type,odometer}]' <<<"$VEHICLES_JSON")
        COUNT=$((COUNT + 1))
    fi
done

TODAY_DAY=$((10#$(date -u +%d)))
declare -A FUEL_BASE=([moto]=90 [carro]=230 [van]=320 [caminhao]=650)
declare -A OIL_BASE=([moto]=70 [carro]=220 [van]=320 [caminhao]=650)
declare -A REPAIR_MULT=([moto]=40 [carro]=100 [van]=130 [caminhao]=220)
OIL_TYPES=("5W-30 sintético" "10W-40 semissintético" "15W-40 mineral" "20W-50 mineral")
REPAIRS=("Troca de pastilhas de freio:380" "Alinhamento e balanceamento:160" "Troca de pneus:1400"
    "Revisão da suspensão:900" "Troca da bateria:520" "Reparo do sistema elétrico:650"
    "Troca de embreagem:1800" "Troca da correia dentada:750")

SUM_FUEL=0; SUM_OIL=0; SUM_REPAIR=0; NUM_FUEL=0; NUM_OIL=0; NUM_REPAIR=0; FAILED=0; FIRST=1

cents_text() { printf '%d.%02d' $(($1 / 100)) $(($1 % 100)); }

stamp() { # stamp MONTHS_AGO DAY -> "YYYY-MM-DD 12:00:00.000Z" (12 to 19 h UTC is still the same day in Brazil)
    local ym; ym=$(date -u -d "$(date -u +%Y-%m-01) -$1 month" +%Y-%m)
    printf '%s-%02d %02d:%02d:00.000Z' "$ym" "$2" $((12 + RANDOM % 8)) $((RANDOM % 60))
}

post() { # post COLLECTION BODY STAMP
    if [ "$DRY_RUN" = 1 ]; then echo "[dry] $1 $3 $2"; return 0; fi
    local response
    if ! response=$(api POST "/api/collections/$1/records" "$(jq -c --arg s "$3" '. + {seed_created:$s}' <<<"$2")"); then
        FAILED=$((FAILED + 1)); echo "Falhou: $1 $3 -> $response" >&2; return 1
    fi
    if [ "$FIRST" = 1 ]; then
        FIRST=0
        local id saved; id=$(jq -r .id <<<"$response")
        saved=$(api GET "/api/collections/$1/records/$id" | jq -r .created)
        if [ "${saved:0:10}" != "${3:0:10}" ]; then
            api DELETE "/api/collections/$1/records/$id" >/dev/null
            echo "O servidor ignorou a data ($saved). Copie seed/seed_backdate.pb.js para backend/pb_hooks, espere 2 s e rode de novo." >&2
            exit 1
        fi
    fi
}

index=0
while read -r vehicle; do
    vid=$(jq -r .id <<<"$vehicle"); type=$(jq -r .type <<<"$vehicle")
    odometer=$(jq -r '.odometer // 0 | floor' <<<"$vehicle")
    [ "$odometer" -ge 5000 ] || odometer=$((20000 + index * 13000))
    for ((m = MONTHS - 1; m >= 0; m--)); do
        last_day=27; [ "$m" -eq 0 ] && last_day=$((TODAY_DAY - 1))
        [ "$last_day" -ge 1 ] || continue
        day_of() { local d=$(($1 + RANDOM % 5)); [ "$d" -gt "$last_day" ] && d=$((1 + RANDOM % last_day)); echo "$d"; }
        km_of() { local k=$((odometer - m * 1500 + $1 * 40)); [ "$k" -lt 1000 ] && k=$((1000 + $1 * 40)); echo "$k.00"; }
        user=${USERS[$(((index + m) % ${#USERS[@]}))]}

        for k in 0 1 2; do
            [ "$k" -eq 2 ] && [ $((RANDOM % 2)) -eq 0 ] && continue
            day=$(day_of $((3 + k * 10)))
            cents=$((FUEL_BASE[$type] * 100 * (80 + RANDOM % 41) / 100))
            case "$type" in
                moto) fuel=gasolina; price=620 ;;
                caminhao) fuel=diesel; price=610 ;;
                van) if [ $((RANDOM % 3)) -eq 0 ]; then fuel=aditivada; price=660; else fuel=diesel; price=610; fi ;;
                *) case $((RANDOM % 3)) in 0) fuel=etanol; price=440 ;; 1) fuel=gasolina; price=620 ;; *) fuel=aditivada; price=660 ;; esac ;;
            esac
            liters=$(awk -v c="$cents" -v p="$price" 'BEGIN{printf "%.2f", c/p}')
            body=$(jq -n --arg v "$vid" --arg u "$user" --arg km "$(km_of "$day")" --arg t "$fuel" \
                --arg l "$liters" --arg c "$(cents_text "$cents")" \
                '{vehicle:$v,user:$u,km_fuel:($km|tonumber),type:$t,liters:($l|tonumber),cost:($c|tonumber)}')
            post fuels "$body" "$(stamp "$m" "$day")" && { SUM_FUEL=$((SUM_FUEL + cents)); NUM_FUEL=$((NUM_FUEL + 1)); }
        done

        if [ $(((m + index) % 2)) -eq 0 ]; then
            day=$(day_of 8)
            cents=$((OIL_BASE[$type] * 100 * (90 + RANDOM % 21) / 100))
            body=$(jq -n --arg v "$vid" --arg u "$user" --arg km "$(km_of "$day")" \
                --arg t "${OIL_TYPES[$(((m + index) % 4))]}" --arg c "$(cents_text "$cents")" \
                '{vehicle:$v,user:$u,km_oil:($km|tonumber),type:$t,cost:($c|tonumber)}')
            post oils "$body" "$(stamp "$m" "$day")" && { SUM_OIL=$((SUM_OIL + cents)); NUM_OIL=$((NUM_OIL + 1)); }
        fi

        if [ $(((m * 3 + index * 2) % 5)) -lt 2 ]; then
            item=${REPAIRS[$(((m + index * 3) % ${#REPAIRS[@]}))]}
            day=$(day_of 15)
            cents=$((${item##*:} * 100 * REPAIR_MULT[$type] / 100 * (85 + RANDOM % 31) / 100))
            body=$(jq -n --arg v "$vid" --arg u "$user" --arg km "$(km_of "$day")" \
                --arg d "${item%%:*}" --arg c "$(cents_text "$cents")" \
                '{vehicle:$v,user:$u,km_repair:($km|tonumber),description:$d,cost:($c|tonumber)}')
            post repairs "$body" "$(stamp "$m" "$day")" && { SUM_REPAIR=$((SUM_REPAIR + cents)); NUM_REPAIR=$((NUM_REPAIR + 1)); }
        fi
    done
    index=$((index + 1))
    echo "Veículo $index/$COUNT pronto."
done < <(jq -c '.[]' <<<"$VEHICLES_JSON")

TOTAL=$((SUM_FUEL + SUM_OIL + SUM_REPAIR))
echo
echo "Criados: $NUM_FUEL abastecimentos, $NUM_OIL trocas de óleo, $NUM_REPAIR manutenções ($FAILED falhas)."
[ "$TOTAL" -gt 0 ] && awk -v f="$SUM_FUEL" -v o="$SUM_OIL" -v r="$SUM_REPAIR" -v t="$TOTAL" 'BEGIN{
    printf "Total R$ %.2f: abastecimento %.0f%%, troca de óleo %.0f%%, manutenção %.0f%%\n", t/100, f*100/t, o*100/t, r*100/t}'
echo "Agora apague seed_backdate.pb.js de backend/pb_hooks."

import chalk from 'chalk';
import crypto from 'crypto';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import { Observable, timer, from } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import yargs, { Argv } from 'yargs';
import axios, { AxiosResponse } from 'axios';
import {notify, Notification} from 'node-notifier';

const BASE_ENDPOINT = 'https://api.binance.com';

function getEndPointUrl(url: string): string {
  return `${BASE_ENDPOINT}${url}`
}

function getNow(): number {
  return Math.round(new Date().getTime());
}

function getSignedQueryString(query: ParsedUrlQueryInput): string {
  const originalQuery = querystring.stringify(query);

  const signature = crypto.createHmac('sha256', process.env.SECRET as string)
    .update(originalQuery)
    .digest('hex');


  return querystring.stringify({ ...query, signature });
}


function getOpenOrders(symbol: string, recvWindow: number = 15000): Observable<any> {
  const baseUrl = getEndPointUrl('/api/v3/openOrders');

  const queryParams = {
    symbol,
    recvWindow,
    timestamp: getNow()
  };

  const path = `${baseUrl}?${getSignedQueryString(queryParams)}`;

  const request: Promise<AxiosResponse<any>> = axios.get(path, {
    headers: {
      'X-MBX-APIKEY': process.env.API
    }
  });

  return from(request);
}

export function run() {
  require('dotenv').config()

  yargs
    .usage('Usage: $0 <command> [options]')
    .command(['monitor', '$0'], 'Monitor pending transactions', (yargs: Argv) => yargs, () => {
      console.log(chalk.green("Recuperando datos de transacciones..."));

      timer(0, 60000)
        .pipe(
          tap(() => console.log(chalk.green("Iniciando petición..."))),
          mergeMap(() => getOpenOrders('BTCUSDT')))
        .subscribe((response: any) => {
          if (!response.data) {
            notify({
              title: 'Transacciones pendientes',
              message: `Existen ${response.data.length} transacciones pendientes.`
            } as Notification);
          } else {
            notify({
              title: 'No hay transacciones programadas.',
              message: 'No hay transacciones programadas.'
            } as Notification);
          }
        }, (error: any) => {
          console.log(error);
        });
    })
    .argv;
}
/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */

import { formatDate } from '@angular/common';
import { Inject, Injectable, Optional } from '@angular/core';
import { format as fnsFormat, getISOWeek as fnsGetISOWeek, parse as fnsParse } from 'date-fns';

import { WeekDayIndex } from './types';
import { NgTimeParser } from './utils';
import { mergeDateConfig, NzDateConfig, NZ_DATE_CONFIG } from './utils';

/**
 * Abstract DateHelperService(Token via Class)
 * Compatibility: compact for original usage by default which using DatePipe
 */
@Injectable()
export abstract class DateHelperService {
  constructor(@Optional() @Inject(NZ_DATE_CONFIG) protected config: NzDateConfig) {
    this.config = mergeDateConfig(this.config);
  }

  abstract getISOWeek(date: Date): number;
  abstract getFirstDayOfWeek(): WeekDayIndex;
  abstract format(date: Date | null, formatStr: string): string;
  abstract parseDate(text: string, formatStr?: string): Date;
  abstract parseTime(text: string, formatStr?: string): Date | undefined;
}

/**
 * DateHelper that handles date formats with date-fns
 */
@Injectable()
export class DateHelperByDateFns extends DateHelperService {
  getISOWeek(date: Date): number {
    return fnsGetISOWeek(date);
  }

  // Use date-fns's "weekStartsOn" to support different locale when "config.firstDayOfWeek" is null
  // https://github.com/date-fns/date-fns/blob/v2.0.0-alpha.27/src/locale/en-US/index.js#L23
  getFirstDayOfWeek(): WeekDayIndex {
    let defaultWeekStartsOn: WeekDayIndex;
    try {
      // TODO: locale
      // defaultWeekStartsOn = this.i18n.getDateLocale().options!.weekStartsOn!;
    } catch (e) {
      defaultWeekStartsOn = 1;
    }
    return this.config.firstDayOfWeek == null ? defaultWeekStartsOn : this.config.firstDayOfWeek;
  }

  /**
   * Format a date
   * @see https://date-fns.org/docs/format#description
   * @param date Date
   * @param formatStr format string
   */
  format(date: Date, formatStr: string): string {
    // TODO: locale
    return date ? fnsFormat(date, formatStr, { locale: null }) : '';
  }

  parseDate(text: string, formatStr: string): Date {
    // TODO: locale
    return fnsParse(text, formatStr, new Date(), {
      locale: null,
      weekStartsOn: this.getFirstDayOfWeek()
    });
  }

  parseTime(text: string, formatStr: string): Date | undefined {
    return this.parseDate(text, formatStr);
  }
}

/**
 * DateHelper that handles date formats with angular's date-pipe
 *
 * @see https://github.com/NG-ZORRO/ng-zorro-antd/issues/2406 - DatePipe may cause non-standard week bug, see:
 *
 */
@Injectable()
export class DateHelperByDatePipe extends DateHelperService {
  getISOWeek(date: Date): number {
    return +this.format(date, 'w');
  }

  getFirstDayOfWeek(): WeekDayIndex {
    if (this.config.firstDayOfWeek === undefined) {
      // TODO: locale
      // const locale = this.i18n.getLocaleId();
      return ['zh-cn', 'zh-tw'].indexOf('locale.toLowerCase()') > -1 ? 1 : 0;
    }
    return this.config.firstDayOfWeek;
  }

  format(date: Date | null, formatStr: string): string {
    // TODO: locale
    return date ? formatDate(date, formatStr, null)! : '';
  }

  parseDate(text: string): Date {
    return new Date(text);
  }

  parseTime(text: string, formatStr: string): Date {
    // TODO: locale
    const parser = new NgTimeParser(formatStr, null);
    return parser.toDate(text);
  }
}

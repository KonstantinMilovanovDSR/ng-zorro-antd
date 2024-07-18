import { NzSafeAny, WeekDayIndex } from "./types";
import { FormStyle, getLocaleDayPeriods, TranslationWidth } from '@angular/common';
import { InjectionToken } from '@angular/core';

export function isNotNil<T>(value: T): value is NonNullable<T> {
  return typeof value !== 'undefined' && value !== null;
}

export function isNil(value: unknown): value is null | undefined {
  return typeof value === 'undefined' || value === null;
}

export function InputBoolean(): NzSafeAny {
  return propDecoratorFactory('InputBoolean', toBoolean);
}

export function toBoolean(value: boolean | string): boolean {
  return value != null && `${value}` !== 'false';
}

function propDecoratorFactory<T, D>(_: string, fallback: (v: T) => D): (target: NzSafeAny, propName: string) => void {
  function propDecorator(target: NzSafeAny, propName: string, originalDescriptor?: TypedPropertyDescriptor<NzSafeAny>): NzSafeAny {
    const privatePropName = `$$__${propName}`;

    Object.defineProperty(target, privatePropName, {
      configurable: true,
      writable: true
    });

    return {
      get(): string {
        return originalDescriptor && originalDescriptor.get ? originalDescriptor.get.bind(this)() : this[privatePropName];
      },
      set(value: T): void {
        if (originalDescriptor && originalDescriptor.set) {
          originalDescriptor.set.bind(this)(fallback(value));
        }
        this[privatePropName] = fallback(value);
      }
    };
  }

  return propDecorator;
}

const isDefined = function (value?: NzSafeAny): boolean {
  return value !== undefined;
};

export function WithConfig<T>() {
  return function ConfigDecorator(target: NzSafeAny, propName: NzSafeAny, originalDescriptor?: TypedPropertyDescriptor<T>): NzSafeAny {
    const privatePropName = `$$__assignedValue__${propName}`;

    Object.defineProperty(target, privatePropName, {
      configurable: true,
      writable: true,
      enumerable: false
    });

    return {
      get(): T | undefined {
        const originalValue = originalDescriptor?.get ? originalDescriptor.get.bind(this)() : this[privatePropName];
        const assignedByUser = ((this.assignmentCount || {})[propName] || 0) > 1;

        if (assignedByUser && isDefined(originalValue)) {
          return originalValue;
        }


        return originalValue;
      },
      set(value?: T): void {
        // If the value is assigned, we consider the newly assigned value as 'assigned by user'.
        this.assignmentCount = this.assignmentCount || {};
        this.assignmentCount[propName] = (this.assignmentCount[propName] || 0) + 1;

        if (originalDescriptor?.set) {
          originalDescriptor.set.bind(this)(value!);
        } else {
          this[privatePropName] = value;
        }
      },
      configurable: true,
      enumerable: true
    };
  };
}

export interface TimeResult {
  hour: number | null;
  minute: number | null;
  second: number | null;
  period: number | null;
}

export class NgTimeParser {
  regex: RegExp = null!;
  matchMap: { [key: string]: null | number } = {
    hour: null,
    minute: null,
    second: null,
    periodNarrow: null,
    periodWide: null,
    periodAbbreviated: null
  };

  constructor(private format: string, private localeId: string) {
    this.genRegexp();
  }

  toDate(str: string): Date {
    const result = this.getTimeResult(str);
    const time = new Date();

    if (isNotNil(result?.hour)) {
      time.setHours(result!.hour);
    }

    if (isNotNil(result?.minute)) {
      time.setMinutes(result!.minute);
    }

    if (isNotNil(result?.second)) {
      time.setSeconds(result!.second);
    }

    if (result?.period === 1 && time.getHours() < 12) {
      time.setHours(time.getHours() + 12);
    }

    return time;
  }

  getTimeResult(str: string): TimeResult | null {
    const match = this.regex.exec(str);
    let period = null;
    if (match) {
      if (isNotNil(this.matchMap.periodNarrow)) {
        period = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Narrow).indexOf(
          match[this.matchMap.periodNarrow + 1]
        );
      }
      if (isNotNil(this.matchMap.periodWide)) {
        period = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Wide).indexOf(match[this.matchMap.periodWide + 1]);
      }
      if (isNotNil(this.matchMap.periodAbbreviated)) {
        period = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Abbreviated).indexOf(
          match[this.matchMap.periodAbbreviated + 1]
        );
      }
      return {
        hour: isNotNil(this.matchMap.hour) ? Number.parseInt(match[this.matchMap.hour + 1], 10) : null,
        minute: isNotNil(this.matchMap.minute) ? Number.parseInt(match[this.matchMap.minute + 1], 10) : null,
        second: isNotNil(this.matchMap.second) ? Number.parseInt(match[this.matchMap.second + 1], 10) : null,
        period
      };
    } else {
      return null;
    }
  }

  genRegexp(): void {
    let regexStr = this.format.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$&');
    const hourRegex = /h{1,2}/i;
    const minuteRegex = /m{1,2}/;
    const secondRegex = /s{1,2}/;
    const periodNarrow = /aaaaa/;
    const periodWide = /aaaa/;
    const periodAbbreviated = /a{1,3}/;

    const hourMatch = hourRegex.exec(this.format);
    const minuteMatch = minuteRegex.exec(this.format);
    const secondMatch = secondRegex.exec(this.format);
    const periodNarrowMatch = periodNarrow.exec(this.format);
    let periodWideMatch: null | RegExpExecArray = null;
    let periodAbbreviatedMatch: null | RegExpExecArray = null;
    if (!periodNarrowMatch) {
      periodWideMatch = periodWide.exec(this.format);
    }
    if (!periodWideMatch && !periodNarrowMatch) {
      periodAbbreviatedMatch = periodAbbreviated.exec(this.format);
    }

    const matchs = [hourMatch, minuteMatch, secondMatch, periodNarrowMatch, periodWideMatch, periodAbbreviatedMatch]
      .filter(m => !!m)
      .sort((a, b) => a!.index - b!.index);

    matchs.forEach((match, index) => {
      switch (match) {
        case hourMatch:
          this.matchMap.hour = index;
          regexStr = regexStr.replace(hourRegex, '(\\d{1,2})');
          break;
        case minuteMatch:
          this.matchMap.minute = index;
          regexStr = regexStr.replace(minuteRegex, '(\\d{1,2})');
          break;
        case secondMatch:
          this.matchMap.second = index;
          regexStr = regexStr.replace(secondRegex, '(\\d{1,2})');
          break;
        case periodNarrowMatch:
          this.matchMap.periodNarrow = index;
          const periodsNarrow = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Narrow).join('|');
          regexStr = regexStr.replace(periodNarrow, `(${periodsNarrow})`);
          break;
        case periodWideMatch:
          this.matchMap.periodWide = index;
          const periodsWide = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Wide).join('|');
          regexStr = regexStr.replace(periodWide, `(${periodsWide})`);
          break;
        case periodAbbreviatedMatch:
          this.matchMap.periodAbbreviated = index;
          const periodsAbbreviated = getLocaleDayPeriods(this.localeId, FormStyle.Format, TranslationWidth.Abbreviated).join('|');
          regexStr = regexStr.replace(periodAbbreviated, `(${periodsAbbreviated})`);
          break;
      }
    });

    this.regex = new RegExp(regexStr);
  }
}

export interface NzDateConfig {
  /** Customize the first day of a week */
  firstDayOfWeek?: WeekDayIndex;
}

export const NZ_DATE_CONFIG = new InjectionToken<NzDateConfig>('date-config');

export const NZ_DATE_CONFIG_DEFAULT: NzDateConfig = {
  firstDayOfWeek: undefined
};

export function mergeDateConfig(config: NzDateConfig): NzDateConfig {
  return { ...NZ_DATE_CONFIG_DEFAULT, ...config };
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isValid } from 'date-fns';
import { slideMotion } from './animations';

import { WithConfig } from './utils';
import { BooleanInput, NzSafeAny } from './types';
import { InputBoolean, isNil } from './utils';
import { DateHelperByDatePipe } from './date-helper.service'
import { Observable, of, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nz-time-picker',
  exportAs: 'nzTimePicker',
  template: `
    <div class="ant-picker-input">
      <input
        #inputElement
        [attr.id]="nzId"
        type="text"
        [size]="inputSize"
        [placeholder]="nzPlaceHolder || (i18nPlaceHolder$ | async)"
        [(ngModel)]="inputValue"
        [disabled]="nzDisabled"
        (focus)="onFocus(true)"
        (blur)="onFocus(false)"
        (keyup.enter)="onKeyupEnter()"
        (keyup.escape)="onKeyupEsc()"
        (ngModelChange)="onInputChange($event)"
      />
      <span class="ant-picker-suffix">
        <!--ng-container *nzStringTemplateOutlet="nzSuffixIcon; let suffixIcon">
          <i nz-icon [nzType]="suffixIcon"></i>
        </ng-container-->
      </span>
      <span *ngIf="nzAllowEmpty && !nzDisabled && value" class="ant-picker-clear" (click)="onClickClearBtn($event)">
        <i nz-icon nzType="close-circle" nzTheme="fill" [attr.aria-label]="nzClearText" [attr.title]="nzClearText"></i>
      </span>
    </div>

    <ng-template>
      <div [@slideMotion]="'enter'" class="ant-picker-dropdown">
        <div class="ant-picker-panel-container">
          <div tabindex="-1" class="ant-picker-panel">
            <nz-time-picker-panel
              [ngClass]="nzPopupClassName"
              [format]="nzFormat"
              [nzHourStep]="nzHourStep"
              [nzMinuteStep]="nzMinuteStep"
              [nzSecondStep]="nzSecondStep"
              [nzDisabledHours]="nzDisabledHours"
              [nzDisabledMinutes]="nzDisabledMinutes"
              [nzDisabledSeconds]="nzDisabledSeconds"
              [nzPlaceHolder]="nzPlaceHolder || (i18nPlaceHolder$ | async)"
              [nzHideDisabledOptions]="nzHideDisabledOptions"
              [nzUse12Hours]="nzUse12Hours"
              [nzDefaultOpenValue]="nzDefaultOpenValue"
              [nzAddOn]="nzAddOn"
              [nzClearText]="nzClearText"
              [nzNowText]="nzNowText"
              [nzOkText]="nzOkText"
              [nzAllowEmpty]="nzAllowEmpty"
              [(ngModel)]="value"
              (ngModelChange)="onPanelValueChange($event)"
              (closePanel)="setCurrentValueAndClose()"
            ></nz-time-picker-panel>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  host: {
    '[class.ant-picker-large]': `nzSize === 'large'`,
    '[class.ant-picker-small]': `nzSize === 'small'`,
    '[class.ant-picker-disabled]': `nzDisabled`,
    '[class.ant-picker-focused]': `focused`,
    '[class.ant-picker-rtl]': `dir === 'rtl'`,
    '(click)': 'open()'
  },
  animations: [slideMotion],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: NzTimePickerComponent, multi: true }],
  styleUrls: ['./ng-zorro-antd.css']
})
export class NzTimePickerComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnChanges, OnDestroy {
  static ngAcceptInputType_nzUse12Hours: BooleanInput;
  static ngAcceptInputType_nzHideDisabledOptions: BooleanInput;
  static ngAcceptInputType_nzAllowEmpty: BooleanInput;
  static ngAcceptInputType_nzDisabled: BooleanInput;
  static ngAcceptInputType_nzAutoFocus: BooleanInput;

  private _onChange?: (value: Date | null) => void;
  private _onTouched?: () => void;
  private destroy$ = new Subject<void>();
  isInit = false;
  focused = false;
  inputValue: string = '';
  value: Date | null = null;
  preValue: Date | null = null;
  inputSize?: number;
  i18nPlaceHolder$: Observable<string | undefined> = of(undefined);
  dir: string = 'ltr';

  @ViewChild('inputElement', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @Input() nzId: string | null = null;
  @Input() nzSize: string | null = null;
  @Input() @WithConfig() nzHourStep: number = 1;
  @Input() @WithConfig() nzMinuteStep: number = 1;
  @Input() @WithConfig() nzSecondStep: number = 1;
  @Input() @WithConfig() nzClearText: string = 'clear';
  @Input() @WithConfig() nzNowText: string = '';
  @Input() @WithConfig() nzOkText: string = '';
  @Input() @WithConfig() nzPopupClassName: string = '';
  @Input() nzPlaceHolder = '';
  @Input() nzAddOn?: TemplateRef<void>;
  @Input() nzDefaultOpenValue?: Date;
  @Input() nzDisabledHours?: () => number[];
  @Input() nzDisabledMinutes?: (hour: number) => number[];
  @Input() nzDisabledSeconds?: (hour: number, minute: number) => number[];
  @Input() @WithConfig() nzFormat: string = 'HH:mm:ss';
  @Input() nzOpen = false;
  @Input() @WithConfig() @InputBoolean() nzUse12Hours: boolean = false;
  @Input() @WithConfig() nzSuffixIcon: string | TemplateRef<NzSafeAny> = 'clock-circle';

  @Output() readonly nzOpenChange = new EventEmitter<boolean>();

  @Input() @InputBoolean() nzHideDisabledOptions = false;
  @Input() @WithConfig() @InputBoolean() nzAllowEmpty: boolean = true;
  @Input() @InputBoolean() nzDisabled = false;
  @Input() @InputBoolean() nzAutoFocus = false;
  @Input() @WithConfig() nzBackdrop = false;

  emitValue(value: Date | null): void {
    this.setValue(value, true);

    if (this._onChange) {
      this._onChange(this.value);
    }

    if (this._onTouched) {
      this._onTouched();
    }
  }

  setValue(value: Date | null, syncPreValue: boolean = false): void {
    if (syncPreValue) {
      this.preValue = isValid(value) ? new Date(value!) : null;
    }
    this.value = isValid(value) ? new Date(value!) : null;
    this.inputValue = this.dateHelper.format(value, this.nzFormat);
    this.cdr.markForCheck();
  }

  open(): void {
    if (this.nzDisabled || this.nzOpen) {
      return;
    }
    this.focus();
    this.nzOpen = true;
    this.nzOpenChange.emit(this.nzOpen);
  }

  close(): void {
    this.nzOpen = false;
    this.cdr.markForCheck();
    this.nzOpenChange.emit(this.nzOpen);
  }

  updateAutoFocus(): void {
    if (this.isInit && !this.nzDisabled) {
      if (this.nzAutoFocus) {
        this.renderer.setAttribute(this.inputRef.nativeElement, 'autofocus', 'autofocus');
      } else {
        this.renderer.removeAttribute(this.inputRef.nativeElement, 'autofocus');
      }
    }
  }

  onClickClearBtn(event: MouseEvent): void {
    event.stopPropagation();
    this.emitValue(null);
  }

  onClickOutside(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target)) {
      this.setCurrentValueAndClose();
    }
  }

  onFocus(value: boolean): void {
    this.focused = value;
  }

  focus(): void {
    if (this.inputRef.nativeElement) {
      this.inputRef.nativeElement.focus();
    }
  }

  blur(): void {
    if (this.inputRef.nativeElement) {
      this.inputRef.nativeElement.blur();
    }
  }

  onKeyupEsc(): void {
    this.setValue(this.preValue);
  }

  onKeyupEnter(): void {
    if (this.nzOpen && isValid(this.value)) {
      this.setCurrentValueAndClose();
    } else if (!this.nzOpen) {
      this.open();
    }
  }

  onInputChange(str: string): void {
    if (document.activeElement === this.inputRef.nativeElement) {
      this.open();
      this.parseTimeString(str);
    }
  }

  onPanelValueChange(value: Date): void {
    this.setValue(value);
    this.focus();
  }

  setCurrentValueAndClose(): void {
    this.emitValue(this.value);
    this.close();
  }

  constructor(
    private element: ElementRef,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private dateHelper: DateHelperByDatePipe,
    private elementRef: ElementRef
  ) {
    // TODO: move to host after View Engine deprecation
    this.elementRef.nativeElement.classList.add('ant-picker');
  }

  ngOnInit(): void {
    this.inputSize = Math.max(8, this.nzFormat.length) + 2;

    // TODO: locale
    // this.i18nPlaceHolder$ = this.i18n.localeChange.pipe(map((nzLocale: NzI18nInterface) => nzLocale.TimePicker.placeholder));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { nzUse12Hours, nzFormat, nzDisabled, nzAutoFocus } = changes;
    if (nzUse12Hours && !nzUse12Hours.previousValue && nzUse12Hours.currentValue && !nzFormat) {
      this.nzFormat = 'h:mm:ss a';
    }
    if (nzDisabled) {
      const value = nzDisabled.currentValue;
      const input = this.inputRef.nativeElement as HTMLInputElement;
      if (value) {
        this.renderer.setAttribute(input, 'disabled', '');
      } else {
        this.renderer.removeAttribute(input, 'disabled');
      }
    }
    if (nzAutoFocus) {
      this.updateAutoFocus();
    }
  }

  parseTimeString(str: string): void {
    const value = this.dateHelper.parseTime(str, this.nzFormat) || null;
    if (isValid(value)) {
      this.value = value;
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit(): void {
    this.isInit = true;
    this.updateAutoFocus();
  }

  writeValue(time: Date | null | undefined): void {
    let result: Date | null;

    if (time instanceof Date) {
      result = time;
    } else if (isNil(time)) {
      result = null;
    } else {
      console.warn('Non-Date type is not recommended for time-picker, use "Date" type.');
      result = new Date(time);
    }

    this.setValue(result, true);
  }

  registerOnChange(fn: (time: Date | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.nzDisabled = isDisabled;
    this.cdr.markForCheck();
  }
}

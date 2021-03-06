import { Http } from '@angular/http';
import { EventEmitter } from '@angular/core';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { Sort, MatSort } from '@angular/material';
import { Observable, Subject } from 'rxjs/Rx';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/merge';
import { ColumnFilter } from './column.directive';
import { Subscription } from 'rxjs/Subscription';

export interface ChangeEvent {
  [event: string]: {
    active: string,
    direction?: 'asc' | 'desc' | '',
    filter?: any
  };
}

export interface Filter {
  [col: string]: any;
}

export interface Sorter {
  [col: string]: 'asc' | 'desc' | '';
}

/**
 * This is the object the Mat Table actually uses.
 * It holds an `InstantDatabase` object, and deliveres
 * living data from this object to the grid.
 */
export class InstantDataSource<T> extends DataSource<T> {
  constructor(public db: InstantDatabase<T>) {
    super();
  }
  connect(): Observable<T[]> {
    return this.db.dataChange;
  }
  disconnect() {
    this.db.onDestroy();
  }
}

/**
 * An object responsible for listening for user changes in
 * the grid, and modifying the data accordingly.
 *
 * Implementors should listen for events in the `onClientChange`
 * method and delivar data to the `dataChange` Subject.
 */
export abstract class InstantDatabase<T> {
  sortChange: EventEmitter<Sort>;
  private sortCache: Sorter = {};
  private _sortSubscriber: Subscription;

  filterChange: Observable<ColumnFilter> = new BehaviorSubject(null);
  private filterCache: Filter = {};
  private _filterSubscriber: Subscription;

  dataChange: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([]);
  dataSnapshot;
  private _dataChangeSubscriber: Subscription;

  onInit() {
    this.onRead();
    this._dataChangeSubscriber = this.dataChange.subscribe(data => this.dataSnapshot = data);
  }
  onDestroy() {
    this._dataChangeSubscriber.unsubscribe();
    this._sortSubscriber.unsubscribe();
    this._filterSubscriber.unsubscribe();
  }
  onRead(sort?: Sorter, filter?: Filter) {}

  _configure(args: Partial<InstantDatabase<T>>) {
    Object.assign(this, args);

    // On any changes, read data
    this._sortSubscriber = this.sortChange.subscribe(sort => {
      this.sortCache = {}; // Reset always. Multiple column sort is NOT supported
      this.sortCache[sort.active] = sort.direction;
      this.onRead(this.sortCache, this.filterCache);
    });
    this._filterSubscriber = this.filterChange.subscribe(filter => {
      this.filterCache[filter.active] = filter.filter;
      this.onRead(this.sortCache, this.filterCache);
    });

    // Attached to a grid. Run init
    if (this.onInit) { this.onInit(); }
  }
}


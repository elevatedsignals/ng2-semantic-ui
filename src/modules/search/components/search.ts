import {
    Component, ViewChild, HostBinding, Input, AfterViewInit, HostListener,
    EventEmitter, Output, Directive, ElementRef, TemplateRef
} from "@angular/core";
import { Util, ITemplateRefContext } from "../../../misc/util";
import { DropdownService, SuiDropdownMenu } from "../../dropdown";
import { ISearchLocaleValues, RecursivePartial, SuiLocalizationService } from "../../../behaviors/localization";
import { SearchService } from "../services/search.service";
import { LookupFn } from "../helpers/lookup-fn";

export interface IResultContext<T> extends ITemplateRefContext<T> {
    query:string;
}

@Component({
    selector: "sui-search",
    template: `
<div class="ui input" [class.icon]="hasIcon" (click)="onClick($event)">
    <input class="prompt" type="text" [attr.placeholder]="placeholder" autocomplete="off" [(ngModel)]="query">
    <i *ngIf="hasIcon" class="search icon"></i>
</div>
<div class="results"
     suiDropdownMenu
     [menuTransition]="transition"
     [menuTransitionDuration]="transitionDuration"
     menuSelectedItemClass="active">

    <sui-search-result *ngFor="let r of results"
                       class="item"
                       [value]="r"
                       [query]="query"
                       [formatter]="resultFormatter"
                       [template]="resultTemplate"
                       (click)="select(r)"></sui-search-result>

    <div *ngIf="results.length == 0" class="message empty">
        <div class="header">{{ localeValues.noResults.header }}</div>
        <div class="description">{{ localeValues.noResults.message }}</div>
    </div>
</div>
`,
    styles: [`
/* Ensures results div has margin. */
:host {
    display: inline-block;
}

/* Fixes positioning when results are pushed above the search. */
.results {
    margin-bottom: .5em;
}
`]
})
export class SuiSearch<T> implements AfterViewInit {
    public dropdownService:DropdownService;
    public searchService:SearchService<T, T>;

    @ViewChild(SuiDropdownMenu)
    private _menu:SuiDropdownMenu;

    // Sets the Semantic UI classes on the host element.
    // Doing it on the host enables use in menus etc.
    @HostBinding("class.ui")
    @HostBinding("class.search")
    private _searchClasses:boolean;

    @HostBinding("class.active")
    public get isActive():boolean {
        return this.dropdownService.isOpen;
    }

    // Sets whether the search element has a visible search icon.
    @Input()
    public hasIcon:boolean;

    private _placeholder:string;

    // Gets & sets the placeholder text displayed inside the text input.
    @Input()
    public get placeholder():string {
        return this._placeholder || this.localeValues.placeholder;
    }

    public set placeholder(placeholder:string) {
        this._placeholder = placeholder;
    }

    private _localeValues:ISearchLocaleValues;

    public localeOverrides:RecursivePartial<ISearchLocaleValues>;

    public get localeValues():ISearchLocaleValues {
        return this._localizationService.override<"search">(this._localeValues, this.localeOverrides);
    }

    public get query():string {
        return this.searchService.query;
    }

    public set query(query:string) {
        this.selectedResult = undefined;
        // Initialise a delayed search.
        this.searchService.updateQueryDelayed(query, () =>
            // Set the results open state depending on whether a query has been entered.
            this.dropdownService.setOpenState(this.searchService.query.length > 0));
    }

    @Input()
    public set options(options:T[]) {
        this.searchService.options = options;
    }

    @Input()
    public set optionsLookup(lookupFn:LookupFn<T>) {
        this.searchService.optionsLookup = lookupFn;
    }

    @Input()
    public set optionsField(field:string) {
        this.searchService.optionsField = field;
    }

    private _resultFormatter?:(r:T, q:string) => string;

    public get resultFormatter():(result:T, query:string) => string {
        if (this._resultFormatter) {
            return this._resultFormatter;
        } else if (this.searchService.optionsLookup) {
            return r => this.readValue(r);
        } else {
            return (r, q) => this.searchService.highlightMatches(this.readValue(r), q);
        }
    }

    @Input()
    public set resultFormatter(formatter:(result:T, query:string) => string) {
        this._resultFormatter = formatter;
    }

    @Input()
    public resultTemplate:TemplateRef<IResultContext<T>>;

    @Input()
    public retainSelectedResult:boolean;

    @Input()
    public set searchDelay(delay:number) {
        this.searchService.searchDelay = delay;
    }

    @HostBinding("class.loading")
    public get isSearching():boolean {
        return this.searchService.isSearching;
    }

    @Input()
    public maxResults:number;

    public get results():T[] {
        return this.searchService.results.slice(0, this.maxResults);
    }

    // Stores the currently selected result.
    public selectedResult?:T;

    // Emits whenever a new result is selected.
    @Output("resultSelected")
    public onResultSelected:EventEmitter<T>;

    @Input()
    public transition:string;

    @Input()
    public transitionDuration:number;

    constructor(private _element:ElementRef, private _localizationService:SuiLocalizationService) {
        this.dropdownService = new DropdownService();
        this.searchService = new SearchService<T, T>();

        this.onLocaleUpdate();
        this._localizationService.onLanguageUpdate.subscribe(() => this.onLocaleUpdate());

        this._searchClasses = true;
        this.hasIcon = true;
        this.retainSelectedResult = true;
        this.searchDelay = 200;
        this.maxResults = 7;

        this.onResultSelected = new EventEmitter<T>();

        this.transition = "scale";
        this.transitionDuration = 200;
    }

    public ngAfterViewInit():void {
        this._menu.service = this.dropdownService;
    }

    private onLocaleUpdate():void {
        this._localeValues = this._localizationService.get().search;
    }

    // Selects a result.
    public select(result:T):void {
        this.onResultSelected.emit(result);
        this.dropdownService.setOpenState(false);

        if (this.retainSelectedResult) {
            this.selectedResult = result;
            this.searchService.updateQuery(this.readValue(result));
        } else {
            this.searchService.updateQuery("");
        }
    }

    public onClick(e:MouseEvent):void {
        this.open();
    }

    @HostListener("focusin")
    private onFocusIn():void {
        if (!this.dropdownService.isAnimating) {
            this.open();
        }
    }

    private open():void {
        if (this.searchService.query.length > 0) {
            // Only open on click when there is a query entered.
            this.dropdownService.setOpenState(true);
        }
    }

    @HostListener("focusout")
    private onFocusOut():void {
        this.dropdownService.setOpenState(false);
    }

    @HostListener("document:click", ["$event"])
    public onDocumentClick(e:MouseEvent):void {
        if (!this._element.nativeElement.contains(e.target)) {
            this.dropdownService.setOpenState(false);
        }
    }

    // Reads the specified field from an item.
    public readValue(object:T):string {
        return Util.Object.readValue<T, string>(object, this.searchService.optionsField);
    }
}

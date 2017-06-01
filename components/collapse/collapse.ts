import {Directive, ElementRef, Input, HostBinding, Renderer2} from '@angular/core';
import "web-animations-js";

@Directive({
    selector: '[suiCollapse]'
})
export class SuiCollapse {
    // Set when the collapse is open, and not animating.
    @HostBinding('class.expanded')
    private _isExpanded:boolean;

    // Set when the collapse is closed, and not animating.
    @HostBinding('class.collapsed')
    private get isCollapsed() {
        return !this._isExpanded && !this._isCollapsing;
    }

    // Set when the collapse is animating.
    @HostBinding('class.collapsing')
    private _isCollapsing:boolean;

    // Flag that is initially true, to make the 1st animation instantaneous.
    private _pristine:boolean;

    @Input()
    private get suiCollapse():boolean {
        return this._isExpanded;
    }

    // Sets the state of the collapse, `true` is collapsed.
    private set suiCollapse(value:boolean) {
        if (value) {
            this.hide();
        }
        else {
            this.show();
        }
    }

    @Input()
    public collapseDuration:number;

    public constructor(private _element:ElementRef, private _renderer: Renderer2) {
        this._pristine = true;

        // Collapse animation duration is 350ms by default.
        this.collapseDuration = 350;

        this._isExpanded = false;
        this._isCollapsing = false;
    }

    public hide() {
        this._isCollapsing = true;
        this._isExpanded = false;

        // Forcibly hide the overflow so that content is not visible past the boundaries of its container.
        this._renderer.setStyle(this._element.nativeElement, 'overflow', 'hidden');

        // Animate the host element from its scroll height to 0.
        this.animate(this._element.nativeElement.scrollHeight, 0, () => {
            this._isCollapsing = false;
        });
    }

    public show() {
        this._isCollapsing = true;

        // Animate the host element from its offset height to its scroll height.
        this.animate(this._element.nativeElement.offsetHeight, this._element.nativeElement.scrollHeight, () => {
            // Remove the overflow override to enable user styling once again.
            this._renderer.removeStyle(this._element.nativeElement, 'overflow');

            this._isCollapsing = false;
            this._isExpanded = true;
        });
    }

    private animate(startHeight:number, endHeight:number, callback:() => void) {
        // Animate the collapse using the web animations API.
        // Using directly because Renderer2 doesn't have invokeElementMethod method anymore.
        this._element.nativeElement.animate(
            [
                {
                    height: `${startHeight}px`
                },
                {
                    height: `${endHeight}px`
                }
            ],
            {
                delay: 0,
                // Disable animation on 1st collapse / expansion.
                duration: this._pristine ? 0 : this.collapseDuration,
                iterations: 1,
                easing: "ease",
                fill: "both"
            }
        );

        if (this._pristine) {
            // Remove pristine flag when first hit.
            this._pristine = false;
        }

        setTimeout(() => callback(), this.collapseDuration);
    }
}
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ComposeMailComponent } from '../compose-mail/compose-mail.component';

@Component({
  selector: 'app-compose-mail-dialog',
  templateUrl: './compose-mail-dialog.component.html',
  styleUrls: ['./compose-mail-dialog.component.scss', './../mail-sidebar.component.scss']
})
export class ComposeMailDialogComponent {
  @Input() public isComposeVisible: boolean;

  @Output() public hide = new EventEmitter<boolean>();

  @ViewChild(ComposeMailComponent) composeMail: ComposeMailComponent;
  @ViewChild('confirmDiscardModal') confirmDiscardModal;

  isMinimized: boolean;
  isMaximized: boolean;
  private confirmModalRef: NgbModalRef;

  constructor(private modalService: NgbModal) {
  }

  onClose() {
    if (this.composeMail.hasData()) {
      this.confirmModalRef = this.modalService.open(this.confirmDiscardModal, {
        centered: true,
        windowClass: 'modal-sm users-action-modal'
      });
    } else if (this.composeMail.draftMail && this.composeMail.draftMail.id) {
      this.discardEmail();
    } else {
      this.hideMailComposeDialog();
    }
  }

  saveInDrafts() {
    this.composeMail.saveInDrafts();
    this.hideMailComposeDialog();
  }

  discardEmail() {
    this.composeMail.discardEmail();
    this.hideMailComposeDialog();
  }

  onHide() {
    this.hideMailComposeDialog();
  }

  toggleMinimized() {
    this.isMinimized = !this.isMinimized;

    if (this.isMaximized) {
      this.isMaximized = false;
    }
  }

  toggleMaximized() {
    this.isMaximized = !this.isMaximized;

    if (this.isMinimized) {
      this.isMinimized = false;
    }
  }

  private hideMailComposeDialog() {
    if (this.confirmModalRef) {
      this.confirmModalRef.dismiss();
    }
    this.hide.emit(true);
  }

}

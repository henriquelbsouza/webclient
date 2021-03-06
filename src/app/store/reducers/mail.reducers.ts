import { MailActions, MailActionTypes } from '../actions';
import { MailState, MailStateFolderInfo } from '../datatypes';
import { Attachment, EmailDisplay, Mail, MailFolderType } from '../models';
import { FilenamePipe } from '../../shared/pipes/filename.pipe';

export function reducer(
  state: MailState = {
    mails: [],
    total_mail_count: 0,
    info_by_folder: new Map(),
    mailDetail: null,
    folders: new Map(),
    loaded: false,
    decryptedContents: {},
    unreadMailsCount: { inbox: 0 },
    noUnreadCountChange: true,
    canGetUnreadCount: true,
    decryptedSubjects: {},
    isMailsMoved: false,
    customFolderMessageCount: [],
    isComposerPopUp: false,
  },
  action: MailActions,
): MailState {
  switch (action.type) {
    case MailActionTypes.GET_MAILS: {
      const mails = state.folders.get(action.payload.folder);
      return {
        ...state,
        loaded: !!(mails && !action.payload.forceReload),
        inProgress: !!action.payload.inProgress,
        currentFolder: action.payload.folder as MailFolderType,
        mails: mails || [],
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.GET_MAILS_SUCCESS: {
      let { mails } = action.payload;
      const target_folder_mails = state.folders.get(action.payload.folder) || [];
      const old_folder_info = state.info_by_folder.get(action.payload.folder);
      const folder_info = new MailStateFolderInfo({
        is_not_first_page: action.payload.is_not_first_page || false,
        total_mail_count: action.payload.total_mail_count,
        is_dirty: false,
      });
      state.info_by_folder.set(action.payload.folder, folder_info);

      if (action.payload.is_from_socket) {
        const mailIDs = mails.map(item => item.id);
        mails = target_folder_mails.filter(item => !mailIDs.includes(item.id));
        mails = [...action.payload.mails, ...mails];
        if (action.payload.folder !== MailFolderType.SPAM) {
          let unread_folder_mails = state.folders.get(MailFolderType.UNREAD) || [];
          const unread_folder_info = state.info_by_folder.get(MailFolderType.UNREAD);
          // prepare unread mails
          if (
            unread_folder_mails &&
            unread_folder_mails.length > 0 &&
            unread_folder_info &&
            !unread_folder_info.is_not_first_page
          ) {
            unread_folder_mails = unread_folder_mails.filter(item => !mailIDs.includes(item.id));
            unread_folder_mails = [...action.payload.mails, ...unread_folder_mails];
            unread_folder_mails = unread_folder_mails.map((mail: Mail) => {
              mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');

              mail.thread_count =
                mail.children_count +
                ((action.payload.folder !== MailFolderType.TRASH && mail.folder !== MailFolderType.TRASH) ||
                (action.payload.folder === MailFolderType.TRASH && mail.folder === MailFolderType.TRASH)
                  ? 1
                  : 0);
              return mail;
            });
            unread_folder_mails = unread_folder_mails.slice(0, action.payload.limit);
            state.folders.set(MailFolderType.UNREAD, unread_folder_mails);
            unread_folder_info.total_mail_count += mailIDs.length;
            state.info_by_folder.set(MailFolderType.UNREAD, unread_folder_info);
          }
          // prepare all mails
          let all_folder_mails = state.folders.get(MailFolderType.ALL_EMAILS) || [];
          const all_folder_info = state.info_by_folder.get(MailFolderType.ALL_EMAILS);
          if (
            all_folder_mails &&
            all_folder_mails.length > 0 &&
            all_folder_info &&
            !all_folder_info.is_not_first_page
          ) {
            all_folder_mails = all_folder_mails.filter(item => !mailIDs.includes(item.id));
            all_folder_mails = [...action.payload.mails, ...all_folder_mails];
            all_folder_mails = all_folder_mails.map((mail: Mail) => {
              mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');
              mail.thread_count =
                mail.children_count +
                ((action.payload.folder !== MailFolderType.TRASH && mail.folder !== MailFolderType.TRASH) ||
                (action.payload.folder === MailFolderType.TRASH && mail.folder === MailFolderType.TRASH)
                  ? 1
                  : 0);
              return mail;
            });
            all_folder_mails = all_folder_mails.slice(0, action.payload.limit);
            state.folders.set(MailFolderType.ALL_EMAILS, all_folder_mails);
            all_folder_info.total_mail_count += mailIDs.length;
            state.info_by_folder.set(MailFolderType.ALL_EMAILS, all_folder_info);
          }
        }
      }
      mails = mails.map((mail: Mail) => {
        mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');
        mail.thread_count =
          mail.children_count +
          ((action.payload.folder !== MailFolderType.TRASH && mail.folder !== MailFolderType.TRASH) ||
          (action.payload.folder === MailFolderType.TRASH && mail.folder === MailFolderType.TRASH)
            ? 1
            : 0);
        return mail;
      });
      if (
        state.currentFolder === action.payload.folder ||
        (state.currentFolder !== action.payload.folder && target_folder_mails.length > 0)
      ) {
        if (!action.payload.is_from_socket || (old_folder_info && !old_folder_info.is_not_first_page)) {
          if (action.payload.limit) {
            mails = mails.slice(0, action.payload.limit);
          }
          state.folders.set(action.payload.folder, mails);
        }
      }
      mails = state.folders.get(state.currentFolder);
      state.total_mail_count = state.info_by_folder.get(state.currentFolder)
        ? state.info_by_folder.get(state.currentFolder).total_mail_count
        : 0;
      mails = mails || [];
      mails.forEach((mail: Mail) => {
        if (mail.is_subject_encrypted && state.decryptedSubjects[mail.id]) {
          mail.subject = state.decryptedSubjects[mail.id];
          mail.is_subject_encrypted = false;
        }
      });
      return {
        ...state,
        mails,
        loaded: true,
        inProgress: false,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.STOP_GETTING_UNREAD_MAILS_COUNT: {
      return {
        ...state,
        canGetUnreadCount: false,
      };
    }

    case MailActionTypes.GET_UNREAD_MAILS_COUNT: {
      return { ...state, noUnreadCountChange: false };
    }
    case MailActionTypes.GET_UNREAD_MAILS_COUNT_SUCCESS: {
      if (action.payload.updateUnreadCount) {
        const totalUnreadMailCount = getTotalUnreadCount({ ...state.unreadMailsCount, ...action.payload });
        const unreadMailData = {
          ...state.unreadMailsCount,
          ...action.payload,
          total_unread_count: totalUnreadMailCount,
        };
        return {
          ...state,
          unreadMailsCount: unreadMailData,
          noUnreadCountChange: false,
        };
      }
      return {
        ...state,
        unreadMailsCount: { ...action.payload, total_unread_count: getTotalUnreadCount(action.payload) },
        noUnreadCountChange: false,
      };
    }
    case MailActionTypes.GET_CUSTOMFOLDER_MESSAGE_COUNT_SUCCESS: {
      return { ...state, customFolderMessageCount: action.payload };
    }
    case MailActionTypes.SET_IS_COMPOSER_POPUP: {
      state.isComposerPopUp = action.payload;
      return {
        ...state,
      };
    }
    case MailActionTypes.MOVE_MAIL: {
      return { ...state, inProgress: true, noUnreadCountChange: true, isMailsMoved: false };
    }

    case MailActionTypes.MOVE_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.toString().split(',');
      state.mails = state.mails.filter(mail => !listOfIDs.includes(mail.id.toString()));
      if (action.payload.sourceFolder) {
        const oldMails = state.folders.get(action.payload.sourceFolder) || [];
        state.folders.set(
          action.payload.sourceFolder,
          oldMails.filter(mail => !listOfIDs.includes(mail.id.toString())),
        );
      }
      let info_keys = [...state.info_by_folder.keys()];
      info_keys = info_keys.filter(folder => folder !== MailFolderType.DRAFT && folder !== MailFolderType.OUTBOX);
      info_keys.map(key => {
        const folder_info = state.info_by_folder.get(key);
        if (folder_info) {
          folder_info.is_dirty = true;
        }
        state.info_by_folder.set(key, folder_info);
      });
      if (
        state.mailDetail &&
        state.mailDetail.children &&
        state.mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
      ) {
        state.mailDetail.children.forEach((child, index) => {
          if (listOfIDs.includes(child.id.toString())) {
            state.mailDetail.children[index] = { ...state.mailDetail.children[index], folder: action.payload.folder };
          }
        });
      }
      if (state.mailDetail && listOfIDs.includes(state.mailDetail.id.toString())) {
        state.mailDetail = { ...state.mailDetail, folder: action.payload.folder };
      }
      return { ...state, inProgress: false, noUnreadCountChange: true, isMailsMoved: true };
    }

    case MailActionTypes.UNDO_DELETE_MAIL_SUCCESS: {
      let { mails } = state;
      if (action.payload.sourceFolder === state.currentFolder) {
        const undo_mails = Array.isArray(action.payload.mail) ? action.payload.mail : [action.payload.mail];

        mails = sortByDueDate([...state.mails, ...undo_mails]);
        state.folders.set(action.payload.sourceFolder, [...mails]);
        const current_folder_info = state.info_by_folder.get(action.payload.sourceFolder);
        current_folder_info.total_mail_count += undo_mails.length;
        state.info_by_folder.set(action.payload.sourceFolder, current_folder_info);
        state.total_mail_count = current_folder_info.total_mail_count;
      }
      let info_keys = [...state.info_by_folder.keys()];
      info_keys = info_keys.filter(folder => folder !== MailFolderType.DRAFT && folder !== MailFolderType.OUTBOX);
      info_keys.map(key => {
        const folder_info = state.info_by_folder.get(key);
        if (folder_info) {
          folder_info.is_dirty = true;
        }
        state.info_by_folder.set(key, folder_info);
      });
      const listOfIDs = action.payload.ids.toString().split(',');
      if (
        state.mailDetail &&
        state.mailDetail.children &&
        state.mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
      ) {
        state.mailDetail.children.forEach((child, index) => {
          if (listOfIDs.includes(child.id.toString())) {
            state.mailDetail.children[index] = {
              ...state.mailDetail.children[index],
              folder: action.payload.sourceFolder,
            };
          }
        });
      }
      if (state.mailDetail && listOfIDs.includes(state.mailDetail.id.toString())) {
        state.mailDetail = { ...state.mailDetail, folder: action.payload.sourceFolder };
      }
      return {
        ...state,
        mails,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.READ_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.split(',');
      let target_folder_mails = state.folders.get(state.currentFolder) || [];
      target_folder_mails = target_folder_mails.filter(mail => {
        if (listOfIDs.includes(mail.id.toString())) {
          mail.read = action.payload.read;
          if (state.currentFolder === MailFolderType.UNREAD && action.payload.read) {
            return false;
          }
        }
        return true;
      });
      state.mails = target_folder_mails;
      state.folders.set(state.currentFolder, target_folder_mails);
      // Add or Remove from Unread folder, if not existed on Unread folder, just set empty Array
      if (state.currentFolder !== MailFolderType.UNREAD) {
        let unread_mails = state.folders.get(MailFolderType.UNREAD) || [];
        if (unread_mails.length > 0) {
          const new_unread_mails = target_folder_mails.filter(mail => {
            return !mail.read && listOfIDs.includes(mail.id.toString());
          });

          unread_mails = unread_mails.filter(mail => {
            return !listOfIDs.includes(mail.id.toString());
          });
          unread_mails = sortByDueDate([...new_unread_mails, ...unread_mails]);
          state.folders.set(MailFolderType.UNREAD, unread_mails);
        } else {
          state.folders.set(MailFolderType.UNREAD, []);
        }
      } else {
        let folders = [...state.folders.keys()];
        folders = folders.filter(
          folder =>
            folder !== MailFolderType.SENT &&
            folder !== MailFolderType.TRASH &&
            folder !== MailFolderType.DRAFT &&
            folder !== MailFolderType.OUTBOX,
        );
        folders.map(folder => {
          const folder_content = state.folders.get(folder) || [];
          if (folder_content.length > 0) {
            let need_to_update = false;
            folder_content.map(mail => {
              if (listOfIDs.includes(mail.id.toString())) {
                mail.read = action.payload.read;
                need_to_update = true;
              }
            });
            if (need_to_update) {
              state.folders.set(folder, folder_content);
            }
          }
        });
      }
      if (state.mailDetail && listOfIDs.includes(state.mailDetail.id.toString())) {
        state.mailDetail = { ...state.mailDetail, read: action.payload.read };
      }
      return { ...state, inProgress: false, noUnreadCountChange: true };
    }

    case MailActionTypes.STAR_MAIL_SUCCESS: {
      const listOfIDs = action.payload.ids.split(',');
      const currentFolder = action.payload.folder || state.currentFolder;
      let target_folder_mails = state.folders.get(currentFolder) || [];
      target_folder_mails = target_folder_mails.filter((mail, currentIndex) => {
        if (listOfIDs.includes(mail.id.toString())) {
          mail.starred = action.payload.starred;
          if (currentFolder === MailFolderType.STARRED) {
            return mail.starred;
          }
        }
        return true;
      });
      state.mails = target_folder_mails;
      state.folders.set(currentFolder, target_folder_mails);
      // Add or Remove from Starred folder, if not existed on Starred folder, just set empty Array
      if (currentFolder !== MailFolderType.STARRED) {
        let starred_mails = state.folders.get(MailFolderType.STARRED) || [];
        if (starred_mails.length > 0) {
          const new_starred = target_folder_mails.filter(mail => {
            return mail.starred && listOfIDs.includes(mail.id.toString());
          });

          starred_mails = starred_mails.filter(mail => {
            return !listOfIDs.includes(mail.id.toString());
          });
          starred_mails = sortByDueDate([...new_starred, ...starred_mails]);
          state.folders.set(MailFolderType.STARRED, starred_mails);
        } else {
          state.folders.set(MailFolderType.STARRED, []);
        }
      } else {
        const folders = [...state.folders.keys()];
        folders.map(folder => {
          const folder_content = state.folders.get(folder) || [];
          if (folder_content.length > 0) {
            let need_to_update = false;
            folder_content.map(mail => {
              if (listOfIDs.includes(mail.id.toString())) {
                mail.starred = action.payload.starred;
                need_to_update = true;
              }
            });
            if (need_to_update) {
              state.folders.set(folder, folder_content);
            }
          }
        });
      }
      if (state.mailDetail && listOfIDs.includes(state.mailDetail.id.toString())) {
        state.mailDetail = { ...state.mailDetail, starred: action.payload.starred };
      }
      return { ...state, inProgress: false, noUnreadCountChange: true };
    }

    case MailActionTypes.DELETE_MAIL_FOR_ALL_SUCCESS:
    case MailActionTypes.DELETE_MAIL_SUCCESS: {
      const folder_keys = [MailFolderType.DRAFT, MailFolderType.TRASH, MailFolderType.SPAM];
      folder_keys.map(key => {
        const folder_info = state.info_by_folder.get(key);
        if (folder_info) {
          folder_info.is_dirty = true;
        }
        state.info_by_folder.set(key, folder_info);
      });
      if (action.payload.isMailDetailPage) {
        return state;
      }
      if ((state.currentFolder === MailFolderType.DRAFT && action.payload.isDraft) || !action.payload.isDraft) {
        const listOfIDs = action.payload.ids.split(',');
        state.mails = state.mails.filter(mail => !listOfIDs.includes(mail.id.toString()));
        if (
          state.mailDetail &&
          state.mailDetail.children &&
          state.mailDetail.children.some(child => listOfIDs.includes(child.id.toString()))
        ) {
          state.mailDetail.children = state.mailDetail.children.filter(
            child => !listOfIDs.includes(child.id.toString()),
          );
        }
      }
      return { ...state, inProgress: false, noUnreadCountChange: true };
    }

    case MailActionTypes.GET_MAIL_DETAIL_SUCCESS: {
      const mail: Mail = action.payload;
      if (mail) {
        if (mail.is_subject_encrypted && state.decryptedSubjects[mail.id]) {
          mail.is_subject_encrypted = false;
          mail.subject = state.decryptedSubjects[mail.id];
        }
        mail.attachments = transformFilename(mail.attachments);
        if (mail.children && mail.children.length > 0) {
          mail.children.forEach(item => {
            item.attachments = transformFilename(item.attachments);
          });
        }
      }
      return {
        ...state,
        mailDetail: action.payload,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.GET_MAIL_DETAIL: {
      return {
        ...state,
        mailDetail: null,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.CLEAR_MAILS_ON_CONVERSATION_MODE_CHANGE: {
      return {
        ...state,
        mails: [],
        total_mail_count: 0,
        info_by_folder: new Map(),
        mailDetail: null,
        folders: new Map(),
        loaded: false,
        unreadMailsCount: { inbox: 0 },
        noUnreadCountChange: true,
        canGetUnreadCount: true,
      };
    }

    case MailActionTypes.CLEAR_MAILS_ON_LOGOUT: {
      return {
        mails: [],
        total_mail_count: 0,
        info_by_folder: new Map(),
        mailDetail: null,
        folders: new Map(),
        loaded: false,
        decryptedContents: {},
        unreadMailsCount: { inbox: 0 },
        noUnreadCountChange: true,
        canGetUnreadCount: true,
        decryptedSubjects: {},
        customFolderMessageCount: [],
      };
    }

    case MailActionTypes.CLEAR_MAIL_DETAIL: {
      return {
        ...state,
        mailDetail: null,
        noUnreadCountChange: true,
      };
    }

    case MailActionTypes.UPDATE_MAIL_DETAIL_CHILDREN: {
      if (state.mailDetail) {
        if (action.payload.last_action_data.last_action) {
          if (state.mailDetail.id === action.payload.last_action_data.last_action_parent_id) {
            state.mailDetail.last_action = action.payload.last_action_data.last_action;
          } else {
            state.mailDetail.children = state.mailDetail.children.map(mail => {
              if (mail.id === action.payload.last_action_data.last_action_parent_id) {
                mail.last_action = action.payload.last_action_data.last_action;
              }
              return mail;
            });
          }
        }
        if (action.payload.parent === state.mailDetail.id) {
          state.mailDetail.children = state.mailDetail.children || [];
          state.mailDetail.children = state.mailDetail.children.filter(child => !(child.id === action.payload.id));
          state.mailDetail.children = [...state.mailDetail.children, action.payload];
        }
      }
      return { ...state, noUnreadCountChange: true };
    }

    case MailActionTypes.SET_CURRENT_FOLDER: {
      const mails = state.folders.get(action.payload);
      const total_mail_count = state.info_by_folder.get(action.payload)
        ? state.info_by_folder.get(action.payload).total_mail_count
        : 0;
      return {
        ...state,
        mails: mails || [],
        total_mail_count,
        currentFolder: action.payload,
      };
    }

    case MailActionTypes.UPDATE_PGP_DECRYPTED_CONTENT: {
      if (action.payload.isDecryptingAllSubjects) {
        if (!action.payload.isPGPInProgress) {
          state.mails = state.mails.map(mail => {
            if (mail.id === action.payload.id) {
              mail.subject = action.payload.decryptedContent.subject;
              mail.is_subject_encrypted = false;
            }
            return mail;
          });
          state.decryptedSubjects[action.payload.id] = action.payload.decryptedContent.subject;
        }
        return { ...state };
      }
      if (!state.decryptedContents[action.payload.id]) {
        state.decryptedContents[action.payload.id] = {
          id: action.payload.id,
          content: action.payload.decryptedContent.content,
          content_plain: action.payload.decryptedContent.content_plain,
          subject: action.payload.decryptedContent.subject,
          incomingHeaders: action.payload.decryptedContent.incomingHeaders,
          inProgress: action.payload.isPGPInProgress,
        };
      } else {
        state.decryptedContents[action.payload.id] = {
          ...state.decryptedContents[action.payload.id],
          content: action.payload.decryptedContent.content,
          content_plain: action.payload.decryptedContent.content_plain,
          subject: action.payload.decryptedContent.subject,
          inProgress: action.payload.isPGPInProgress,
          incomingHeaders: action.payload.decryptedContent.incomingHeaders,
        };
      }
      return { ...state, decryptedContents: { ...state.decryptedContents }, noUnreadCountChange: true };
    }

    case MailActionTypes.UPDATE_CURRENT_FOLDER: {
      let newEntry = true;
      let target_folder_mails = state.folders.get(action.payload.folder) || [];
      target_folder_mails.map((mail, index) => {
        if (mail.id === action.payload.id || mail.id === action.payload.parent) {
          if (mail.id === action.payload.id) {
            target_folder_mails[index] = action.payload;
          } else {
            target_folder_mails[index].children = target_folder_mails[index].children
              ? [...target_folder_mails[index].children, action.payload]
              : [action.payload];
            target_folder_mails[index].has_children = true;
          }
          newEntry = false;
        }
      });
      if (target_folder_mails.length > 0 || state.currentFolder === action.payload.folder) {
        if (newEntry) {
          const mail = action.payload;
          mail.receiver_list = mail.receiver_display.map((item: EmailDisplay) => item.name).join(', ');
          mail.thread_count =
            mail.children_count +
            (action.payload.folder !== MailFolderType.TRASH ||
            (action.payload.folder === MailFolderType.TRASH && mail.folder === MailFolderType.TRASH)
              ? 1
              : 0);

          target_folder_mails = [mail, ...target_folder_mails];
          const old_folder_info = state.info_by_folder.get(action.payload.folder);
          old_folder_info.total_mail_count += 1;
          state.info_by_folder.set(action.payload.folder, old_folder_info);
        }
        state.folders.set(action.payload.folder, target_folder_mails);
        if (state.currentFolder === action.payload.folder) {
          state.mails = target_folder_mails;
          const folder_info = state.info_by_folder.get(action.payload.folder);
          state.total_mail_count = folder_info.total_mail_count;
        }
      }
      if (action.payload.folder === MailFolderType.SENT) {
        // Remove the draft mails from store, so that it would fetch again when needed to list
        state.folders.set(MailFolderType.DRAFT, []);
      }

      return { ...state, mails: [...state.mails], noUnreadCountChange: true };
    }

    case MailActionTypes.EMPTY_FOLDER: {
      return { ...state, inProgress: true, noUnreadCountChange: true };
    }

    case MailActionTypes.EMPTY_FOLDER_SUCCESS: {
      state.folders.set(action.payload.folder, []);
      return { ...state, mails: [], inProgress: false };
    }

    case MailActionTypes.EMPTY_FOLDER_FAILURE: {
      return { ...state, inProgress: false };
    }

    case MailActionTypes.MOVE_TAB: {
      return { ...state, currentSettingsTab: action.payload };
    }

    case MailActionTypes.EMPTY_ONLY_FOLDER: {
      state.folders.set(action.payload.folder, []);
      return { ...state, inProgress: false };
    }

    default: {
      return state;
    }
  }
}

function transformFilename(attachments: Attachment[]) {
  if (attachments && attachments.length > 0) {
    attachments = attachments.map(attachment => {
      if (!attachment.name) {
        attachment.name = FilenamePipe.tranformToFilename(attachment.document);
      }
      return attachment;
    });
  }
  return attachments;
}

function sortByDueDate(sortArray): any[] {
  return sortArray.sort((previous: any, next: any) => {
    const next_updated = next.updated || null;
    const previous_updated = previous.updated || null;
    return <any>new Date(next_updated) - <any>new Date(previous_updated);
  });
}

function getTotalUnreadCount(data): number {
  if (data) {
    let total_count = 0;
    Object.keys(data).map(key => {
      if (
        key !== MailFolderType.SENT &&
        key !== MailFolderType.TRASH &&
        key !== MailFolderType.DRAFT &&
        key !== MailFolderType.OUTBOX &&
        key !== MailFolderType.SPAM &&
        key !== 'total_unread_count' &&
        key !== MailFolderType.STARRED &&
        key !== 'updateUnreadCount' &&
        key !== 'outbox_dead_man_counter' &&
        key !== 'outbox_delayed_delivery_counter' &&
        key !== 'outbox_self_destruct_counter'
      ) {
        if (!isNaN(data[`${key}`])) {
          total_count += data[`${key}`];
        }
      }
    });

    return total_count;
  }
  return 0;
}

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TimeAgo from 'timeago-react';

import Icon from 'components/Icon';
import InlineEditor from 'components/InlineEditor';
import PageHeaderFoldable, { Option } from 'components/PageHeaderFoldable';
import TagList from 'components/TagList';
import handleError, { ErrorLevel, ErrorType } from 'ErrorHandler';
import useExperimentTags from 'hooks/useExperimentTags';
import ExperimentHeaderProgress from 'pages/ExperimentDetails/Header/ExperimentHeaderProgress';
import ExperimentState from 'pages/ExperimentDetails/Header/ExperimentHeaderState';
import { handlePath, paths, routeToReactUrl } from 'routes/utils';
import {
  archiveExperiment, deleteExperiment, openOrCreateTensorboard, patchExperiment,
  unarchiveExperiment,
} from 'services/api';
import { getStateColorCssVar } from 'themes';
import { DetailedUser, ExperimentBase, RecordKey, RunState, TrialDetails } from 'types';
import { getDuration, shortEnglishHumannizer } from 'utils/time';
import { terminalRunStates } from 'utils/types';
import { openCommand } from 'wait';

import css from './ExperimentDetailsHeader.module.scss';

interface Props {
  curUser?: DetailedUser;
  experiment: ExperimentBase;
  fetchExperimentDetails: () => void;
  showContinueTrial?: () => void;
  showForkModal?: () => void;
  trial?: TrialDetails;
}

const ExperimentDetailsHeader: React.FC<Props> = ({
  curUser,
  experiment,
  fetchExperimentDetails,
  showContinueTrial,
  showForkModal,
  trial,
}: Props) => {
  const [ isRunningArchive, setIsRunningArchive ] = useState<boolean>(false);
  const [ isRunningTensorboard, setIsRunningTensorboard ] = useState<boolean>(false);
  const [ isRunningUnarchive, setIsRunningUnarchive ] = useState<boolean>(false);
  const [ isRunningDelete, setIsRunningDelete ] = useState<boolean>(
    experiment.state === RunState.Deleting,
  );
  const experimentTags = useExperimentTags(fetchExperimentDetails);

  const deleteExperimentHandler = useCallback(() => {
    Modal.confirm({
      content: `
      Are you sure you want to delete
      this experiment?
    `,
      icon: <ExclamationCircleOutlined />,
      okText: 'Delete',
      onOk: async () => {
        await deleteExperiment({ experimentId: experiment.id });
        routeToReactUrl(paths.experimentList());
      },
      title: 'Confirm Experiment Deletion',
    });
  }, [ experiment.id ]);

  useEffect(() => {
    setIsRunningArchive(false);
    setIsRunningUnarchive(false);
  }, [ experiment.archived ]);

  useEffect(() => {
    setIsRunningDelete(experiment.state === RunState.Deleting);
  }, [ experiment.state ]);

  const handleDescriptionUpdate = useCallback(async (newValue: string) => {
    try {
      await patchExperiment({ body: { description: newValue }, experimentId: experiment.id });
      await fetchExperimentDetails();
    } catch (e) {
      handleError({
        error: e,
        level: ErrorLevel.Error,
        message: e.message,
        publicMessage: 'Please try again later.',
        publicSubject: 'Unable to update experiment description.',
        silent: false,
        type: ErrorType.Server,
      });
    }
  }, [ experiment.id, fetchExperimentDetails ]);

  const handleNameUpdate = useCallback(async (newValue: string) => {
    try {
      await patchExperiment({ body: { name: newValue }, experimentId: experiment.id });
      await fetchExperimentDetails();
    } catch (e) {
      handleError({
        error: e,
        level: ErrorLevel.Error,
        message: e.message,
        publicMessage: 'Please try again later.',
        publicSubject: 'Unable to update experiment name.',
        silent: false,
        type: ErrorType.Server,
      });
    }
  }, [ experiment.id, fetchExperimentDetails ]);

  const headerOptions = useMemo(() => {
    const options: Record<RecordKey, Option> = {
      archive: {
        isLoading: isRunningArchive,
        key: 'unarchive',
        label: 'Unarchive',
        onClick: async (): Promise<void> => {
          setIsRunningUnarchive(true);
          try {
            await unarchiveExperiment({ experimentId: experiment.id });
            await fetchExperimentDetails();
          } catch (e) {
            setIsRunningUnarchive(false);
          }
        },
      },
      continueTrial: {
        key: 'continue-trial',
        label: 'Continue Trial',
        onClick: showContinueTrial,
      },
      delete: {
        icon: <Icon name="fork" size="small" />,
        isLoading: isRunningDelete,
        key: 'delete',
        label: 'Delete',
        onClick: deleteExperimentHandler,
      },
      downloadModel: {
        icon: <Icon name="download" size="small" />,
        key: 'download-model',
        label: 'Download Model',
        onClick: (e) => {
          handlePath(e, { external: true, path: paths.experimentModelDef(experiment.id) });
        },
      },
      fork: {
        icon: <Icon name="fork" size="small" />,
        key: 'fork',
        label: 'Fork',
        onClick: showForkModal,
      },
      tensorboard: {
        icon: <Icon name="tensorboard" size="small" />,
        isLoading: isRunningTensorboard,
        key: 'tensorboard',
        label: 'TensorBoard',
        onClick: async () => {
          setIsRunningTensorboard(true);
          try {
            const tensorboard = await openOrCreateTensorboard({ experimentIds: [ experiment.id ] });
            openCommand(tensorboard);
            setIsRunningTensorboard(false);
          } catch (e) {
            setIsRunningTensorboard(false);
          }
        },
      },
      unarchive: {
        isLoading: isRunningUnarchive,
        key: 'archive',
        label: 'Archive',
        onClick: async (): Promise<void> => {
          setIsRunningArchive(true);
          try {
            await archiveExperiment({ experimentId: experiment.id });
            await fetchExperimentDetails();
          } catch (e) {
            setIsRunningArchive(false);
          }
        },
      },
    };
    return [
      showForkModal && options.fork,
      showContinueTrial && options.continueTrial,
      options.tensorboard,
      options.downloadModel,
      terminalRunStates.has(experiment.state) && (
        experiment.archived ? options.archive : options.unarchive
      ),
      curUser?.isAdmin && terminalRunStates.has(experiment.state) && options.delete,
    ].filter(option => !!option) as Option[];
  }, [
    deleteExperimentHandler,
    isRunningDelete,
    curUser?.isAdmin,
    experiment.archived,
    experiment.id,
    experiment.state,
    fetchExperimentDetails,
    isRunningArchive,
    isRunningTensorboard,
    isRunningUnarchive,
    showContinueTrial,
    showForkModal,
  ]);

  return (
    <>
      <PageHeaderFoldable
        foldableContent={
          <div className={css.foldableSection}>
            <div className={css.foldableItem}>
              <span className={css.foldableItemLabel}>Description:</span>
              <InlineEditor
                allowNewline
                isOnDark
                maxLength={500}
                placeholder="experiment description"
                value={experiment.description || ''}
                onSave={handleDescriptionUpdate} />
            </div>
            <div className={css.foldableItem}>
              <span className={css.foldableItemLabel}>Start Time:</span>
              <Tooltip title={new Date(experiment.startTime).toLocaleString()}>
                <TimeAgo datetime={new Date(experiment.startTime)} />
              </Tooltip>
            </div>
            {experiment.endTime != null && (
              <div className={css.foldableItem}>
                <span className={css.foldableItemLabel}>Duration:</span>
                {shortEnglishHumannizer(getDuration(experiment))}
              </div>
            )}
            <TagList
              ghost={true}
              tags={experiment.config.labels || []}
              onChange={experimentTags.handleTagListChange(experiment.id)}
            />
          </div>
        }
        leftContent={
          trial ? (
            <div className={css.base}>
              <div className={css.experimentInfo}>
                <div className={css.experimentId}>Experiment {experiment.id}</div>
              </div>
              <div className={css.experimentName}>
                <InlineEditor
                  isOnDark
                  maxLength={128}
                  placeholder="experiment name"
                  value={experiment.name}
                  onSave={handleNameUpdate} />
              </div>
              <Icon name="arrow-right" size="tiny" />
              <div className={css.trial}>
                <div
                  className={css.state}
                  style={{ backgroundColor: getStateColorCssVar(trial.state) }}>
                  {trial.state}
                </div>
              Trial {trial.id}
              </div>
            </div>
          ) : (
            <div className={css.base}>
              <div className={css.experimentInfo}>
                <ExperimentState experiment={experiment} />
                <div className={css.experimentId}>Experiment {experiment.id}</div>
              </div>
              <div className={css.experimentName}>
                <InlineEditor
                  isOnDark
                  maxLength={128}
                  placeholder="experiment name"
                  value={experiment.name}
                  onSave={handleNameUpdate} />
              </div>
            </div>
          )
        }
        options={headerOptions}
        style={{ backgroundColor: getStateColorCssVar(experiment.state) }}
      />
      <ExperimentHeaderProgress experiment={experiment} />
    </>
  );
};

export default ExperimentDetailsHeader;
